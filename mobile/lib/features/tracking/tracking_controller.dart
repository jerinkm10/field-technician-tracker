import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'location_tracking_service.dart';
import 'tracking_state.dart';

final trackingControllerProvider =
    StateNotifierProvider<TrackingController, TrackingState>((ref) {
  return TrackingController(
    locationTrackingService: ref.watch(locationTrackingServiceProvider),
  );
});

class TrackingController extends StateNotifier<TrackingState> {
  TrackingController({
    required LocationTrackingService locationTrackingService,
  })  : _locationTrackingService = locationTrackingService,
        super(locationTrackingService.currentState) {
    _subscription = _locationTrackingService.stateStream.listen((nextState) {
      state = nextState;
    });
  }

  final LocationTrackingService _locationTrackingService;
  late final StreamSubscription<TrackingState> _subscription;

  Future<bool> startTracking({
    String? jobId,
  }) async {
    return _locationTrackingService.startTracking(jobId: jobId);
  }

  Future<bool> syncLocation({
    String? jobId,
  }) async {
    return _locationTrackingService.syncLocation(jobId: jobId);
  }

  Future<void> stopTracking() async {
    await _locationTrackingService.stopTracking();
  }

  void clearError() {
    _locationTrackingService.clearError();
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
