class TrackingState {
  const TrackingState({
    this.isTracking = false,
    this.isSyncing = false,
    this.activeJobId,
    this.lastSyncedAt,
    this.pendingLogsCount = 0,
    this.errorMessage,
  });

  final bool isTracking;
  final bool isSyncing;
  final String? activeJobId;
  final DateTime? lastSyncedAt;
  final int pendingLogsCount;
  final String? errorMessage;

  static const _unset = Object();

  TrackingState copyWith({
    bool? isTracking,
    bool? isSyncing,
    Object? activeJobId = _unset,
    Object? lastSyncedAt = _unset,
    int? pendingLogsCount,
    Object? errorMessage = _unset,
  }) {
    return TrackingState(
      isTracking: isTracking ?? this.isTracking,
      isSyncing: isSyncing ?? this.isSyncing,
      activeJobId: identical(activeJobId, _unset)
          ? this.activeJobId
          : activeJobId as String?,
      lastSyncedAt: identical(lastSyncedAt, _unset)
          ? this.lastSyncedAt
          : lastSyncedAt as DateTime?,
      pendingLogsCount: pendingLogsCount ?? this.pendingLogsCount,
      errorMessage: identical(errorMessage, _unset)
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}
