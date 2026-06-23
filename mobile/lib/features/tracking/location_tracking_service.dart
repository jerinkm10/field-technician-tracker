import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/local_storage.dart';
import '../../shared/models/pending_location_log.dart';
import 'tracking_repository.dart';
import 'tracking_state.dart';

final locationTrackingServiceProvider = Provider<LocationTrackingService>((ref) {
  final service = LocationTrackingService(
    connectivity: ref.watch(connectivityProvider),
    trackingRepository: ref.watch(trackingRepositoryProvider),
  );

  ref.onDispose(service.dispose);
  return service;
});

class LocationTrackingService {
  LocationTrackingService({
    required Connectivity connectivity,
    required TrackingRepository trackingRepository,
  })  : _connectivity = connectivity,
        _trackingRepository = trackingRepository,
        _state = TrackingState(
          pendingLogsCount: AppLocalStorage.getPendingTrackingLogs().length,
        ) {
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      _handleConnectivityChanged,
    );
    unawaited(syncPendingLogs());
  }

  final Connectivity _connectivity;
  final TrackingRepository _trackingRepository;
  final StreamController<TrackingState> _stateController =
      StreamController<TrackingState>.broadcast();

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _timer;
  bool _isSyncInProgress = false;
  TrackingState _state;

  TrackingState get currentState => _state;
  Stream<TrackingState> get stateStream => _stateController.stream;

  Future<bool> startTracking({
    String? jobId,
  }) async {
    final isReady = await _ensureLocationReady();
    if (!isReady) {
      return false;
    }

    _timer?.cancel();
    _emit(
      _state.copyWith(
        isTracking: true,
        activeJobId: jobId,
        errorMessage: null,
      ),
    );

    final didCapture = await syncLocation(jobId: jobId);
    if (!didCapture) {
      _emit(
        _state.copyWith(
          isTracking: false,
          activeJobId: null,
        ),
      );
      return false;
    }

    _timer = Timer.periodic(const Duration(seconds: 30), (_) {
      unawaited(syncLocation());
    });

    return true;
  }

  Future<bool> syncLocation({
    String? jobId,
  }) async {
    final effectiveJobId = jobId ?? _state.activeJobId;
    if (_isSyncInProgress) {
      return false;
    }

    _isSyncInProgress = true;
    _emit(
      _state.copyWith(
        isSyncing: true,
        errorMessage: null,
      ),
    );

    PendingLocationLog? capturedLog;

    try {
      final position = await Geolocator.getCurrentPosition();
      capturedLog = PendingLocationLog(
        id: DateTime.now().microsecondsSinceEpoch.toString(),
        jobId: effectiveJobId,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        speed: position.speed < 0 ? 0 : position.speed,
        recordedAt: DateTime.now(),
      );

      final isOnline = await _hasInternetConnection();
      if (!isOnline) {
        await _queuePendingLog(capturedLog);
        _emit(
          _state.copyWith(
            isTracking: _state.isTracking,
            isSyncing: false,
            pendingLogsCount: AppLocalStorage.getPendingTrackingLogs().length,
            errorMessage: 'Offline. Location saved locally for later sync.',
          ),
        );
        return true;
      }

      await syncPendingLogs();
      await _trackingRepository.postPendingLocationLog(capturedLog);

      _emit(
        _state.copyWith(
          isTracking: _state.isTracking,
          isSyncing: false,
          activeJobId: effectiveJobId,
          lastSyncedAt: capturedLog.recordedAt,
          pendingLogsCount: AppLocalStorage.getPendingTrackingLogs().length,
          errorMessage: null,
        ),
      );
      return true;
    } on DioException catch (error) {
      final shouldQueue = _shouldQueueForOffline(error);
      if (shouldQueue && capturedLog != null) {
        await _queuePendingLog(capturedLog);
        _emit(
          _state.copyWith(
            isSyncing: false,
            pendingLogsCount: AppLocalStorage.getPendingTrackingLogs().length,
            errorMessage: 'Offline. Location saved locally for later sync.',
          ),
        );
        return true;
      }

      _emit(
        _state.copyWith(
          isSyncing: false,
          errorMessage: _resolveErrorMessage(error),
        ),
      );
      return false;
    } catch (_error) {
      _emit(
        _state.copyWith(
          isSyncing: false,
          errorMessage: 'Unable to capture current location',
        ),
      );
      return false;
    } finally {
      _isSyncInProgress = false;
    }
  }

  Future<int> syncPendingLogs() async {
    final isOnline = await _hasInternetConnection();
    if (!isOnline) {
      _emit(
        _state.copyWith(
          pendingLogsCount: AppLocalStorage.getPendingTrackingLogs().length,
        ),
      );
      return 0;
    }

    final logs = AppLocalStorage.getPendingTrackingLogs()
        .map(PendingLocationLog.fromJson)
        .toList();

    if (logs.isEmpty) {
      _emit(
        _state.copyWith(
          pendingLogsCount: 0,
        ),
      );
      return 0;
    }

    final remainingLogs = <PendingLocationLog>[];
    var syncedCount = 0;
    DateTime? latestSyncedAt;

    for (final log in logs) {
      try {
        await _trackingRepository.postPendingLocationLog(log);
        syncedCount += 1;
        latestSyncedAt = log.recordedAt;
      } on DioException catch (error) {
        remainingLogs.add(log);
        if (_shouldQueueForOffline(error)) {
          final currentIndex = logs.indexOf(log);
          remainingLogs.addAll(logs.skip(currentIndex + 1));
          break;
        }
      } catch (_error) {
        remainingLogs.add(log);
      }
    }

    await AppLocalStorage.savePendingTrackingLogs(
      remainingLogs.map((log) => log.toJson()).toList(),
    );

    _emit(
      _state.copyWith(
        lastSyncedAt: latestSyncedAt ?? _state.lastSyncedAt,
        pendingLogsCount: remainingLogs.length,
        errorMessage: remainingLogs.isEmpty ? null : _state.errorMessage,
      ),
    );

    return syncedCount;
  }

  Future<void> stopTracking() async {
    _timer?.cancel();
    _timer = null;

    _emit(
      _state.copyWith(
        isTracking: false,
        isSyncing: false,
        activeJobId: null,
        errorMessage: null,
      ),
    );
  }

  void clearError() {
    if (_state.errorMessage != null) {
      _emit(_state.copyWith(errorMessage: null));
    }
  }

  void dispose() {
    _timer?.cancel();
    _connectivitySubscription?.cancel();
    _stateController.close();
  }

  Future<bool> _ensureLocationReady() async {
    final permission = await Geolocator.checkPermission();
    var grantedPermission = permission;

    if (grantedPermission == LocationPermission.denied) {
      grantedPermission = await Geolocator.requestPermission();
    }

    if (grantedPermission == LocationPermission.denied ||
        grantedPermission == LocationPermission.deniedForever) {
      _emit(
        _state.copyWith(
          errorMessage: 'Location permission is required to start tracking',
        ),
      );
      return false;
    }

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _emit(
        _state.copyWith(
          errorMessage: 'Location services are disabled',
        ),
      );
      return false;
    }

    return true;
  }

  Future<void> _queuePendingLog(PendingLocationLog log) async {
    await AppLocalStorage.addPendingTrackingLog(log.toJson());
  }

  Future<bool> _hasInternetConnection() async {
    final results = await _connectivity.checkConnectivity();
    return results.any((result) => result != ConnectivityResult.none);
  }

  Future<void> _handleConnectivityChanged(
    List<ConnectivityResult> results,
  ) async {
    final isOnline = results.any((result) => result != ConnectivityResult.none);
    if (!isOnline) {
      return;
    }

    await syncPendingLogs();
  }

  bool _shouldQueueForOffline(DioException error) {
    return error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout;
  }

  String _resolveErrorMessage(DioException error) {
    final responseData = error.response?.data;
    if (responseData is Map) {
      final message = Map<String, dynamic>.from(responseData)['message'];
      if (message is List) {
        return message.join(', ');
      }
      if (message is String && message.isNotEmpty) {
        return message;
      }
    }

    return error.response?.statusMessage ?? 'Unable to sync location';
  }

  void _emit(TrackingState nextState) {
    _state = nextState;
    if (!_stateController.isClosed) {
      _stateController.add(_state);
    }
  }
}
