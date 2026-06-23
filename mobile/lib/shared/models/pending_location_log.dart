class PendingLocationLog {
  const PendingLocationLog({
    required this.id,
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.speed,
    required this.recordedAt,
    this.jobId,
    this.batteryLevel,
  });

  final String id;
  final String? jobId;
  final double latitude;
  final double longitude;
  final double accuracy;
  final double speed;
  final int? batteryLevel;
  final DateTime recordedAt;

  factory PendingLocationLog.fromJson(Map<String, dynamic> json) {
    return PendingLocationLog(
      id: json['id'] as String? ?? '',
      jobId: json['jobId'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0,
      speed: (json['speed'] as num?)?.toDouble() ?? 0,
      batteryLevel: json['batteryLevel'] as int?,
      recordedAt: DateTime.parse(
        json['recordedAt'] as String? ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'jobId': jobId,
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'speed': speed,
      'batteryLevel': batteryLevel,
      'recordedAt': recordedAt.toUtc().toIso8601String(),
    };
  }
}
