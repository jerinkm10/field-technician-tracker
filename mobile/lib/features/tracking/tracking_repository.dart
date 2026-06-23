import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../shared/models/pending_location_log.dart';

final trackingRepositoryProvider = Provider<TrackingRepository>((ref) {
  return TrackingRepository(ref.watch(dioProvider));
});

class TrackingRepository {
  TrackingRepository(this._dio);

  final Dio _dio;

  Future<void> postLocation({
    String? jobId,
    required double latitude,
    required double longitude,
    required double accuracy,
    required double speed,
    required DateTime recordedAt,
    int? batteryLevel,
  }) async {
    await _dio.post<void>(
      '/tracking/location',
      data: {
        if (jobId != null) 'jobId': jobId,
        'latitude': latitude,
        'longitude': longitude,
        'accuracy': accuracy,
        'speed': speed,
        'batteryLevel': batteryLevel,
        'recordedAt': recordedAt.toUtc().toIso8601String(),
      },
    );
  }

  Future<void> postPendingLocationLog(PendingLocationLog log) {
    return postLocation(
      jobId: log.jobId,
      latitude: log.latitude,
      longitude: log.longitude,
      accuracy: log.accuracy,
      speed: log.speed,
      batteryLevel: log.batteryLevel,
      recordedAt: log.recordedAt,
    );
  }
}
