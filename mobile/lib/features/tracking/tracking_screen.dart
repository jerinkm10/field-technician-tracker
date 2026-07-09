import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../shared/models/mobile_portal_models.dart';
import '../../shared/repositories/mobile_portal_repository.dart';
import '../location/current_position_provider.dart';
import 'tracking_controller.dart';

class TrackingScreen extends ConsumerStatefulWidget {
  const TrackingScreen({super.key});

  @override
  ConsumerState<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends ConsumerState<TrackingScreen> {
  AttendanceOverview? _attendance;
  bool _loadingAttendance = true;
  bool _attendanceBusy = false;
  String? _attendanceError;

  @override
  void initState() {
    super.initState();
    _loadAttendance();
  }

  Future<void> _loadAttendance() async {
    setState(() {
      _loadingAttendance = true;
      _attendanceError = null;
    });

    try {
      final attendance = await ref.read(mobilePortalRepositoryProvider).getAttendance();

      if (!mounted) {
        return;
      }

      setState(() {
        _attendance = attendance;
        _loadingAttendance = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loadingAttendance = false;
        _attendanceError = error.toString();
      });
    }
  }

  Future<void> _checkIn() async {
    setState(() {
      _attendanceBusy = true;
    });

    try {
      final position = await getCurrentDevicePosition();
      await ref.read(mobilePortalRepositoryProvider).checkIn(
            latitude: position?.latitude,
            longitude: position?.longitude,
            accuracy: position?.accuracy,
          );
      await _loadAttendance();

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Attendance checked in.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to check in: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _attendanceBusy = false;
        });
      }
    }
  }

  Future<void> _checkOut() async {
    setState(() {
      _attendanceBusy = true;
    });

    try {
      final position = await getCurrentDevicePosition();
      await ref.read(mobilePortalRepositoryProvider).checkOut(
            latitude: position?.latitude,
            longitude: position?.longitude,
            accuracy: position?.accuracy,
          );
      await _loadAttendance();

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Attendance checked out.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to check out: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _attendanceBusy = false;
        });
      }
    }
  }

  String _formatDateTime(DateTime? value) {
    if (value == null) {
      return '--';
    }

    return DateFormat('dd MMM yyyy, hh:mm a').format(value.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final trackingState = ref.watch(trackingControllerProvider);
    final timestamp = trackingState.lastSyncedAt == null
        ? 'Pending'
        : _formatDateTime(trackingState.lastSyncedAt);
    final activeSession = _attendance?.activeSession;

    return RefreshIndicator(
      onRefresh: () async {
        await _loadAttendance();
      },
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Attendance',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Check in, check out, and keep the live location tracker healthy during field work.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 20),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: _loadingAttendance
                  ? const Center(child: CircularProgressIndicator())
                  : _attendanceError != null
                      ? Column(
                          children: [
                            Text(
                              _attendanceError!,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 12),
                            FilledButton(
                              onPressed: _loadAttendance,
                              child: const Text('Retry'),
                            ),
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    activeSession == null
                                        ? 'No active attendance session'
                                        : 'Attendance session active',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w800),
                                  ),
                                ),
                                _AttendanceBadge(
                                  label: activeSession == null ? 'Checked Out' : 'Checked In',
                                  color: activeSession == null
                                      ? const Color(0xFF6C7A89)
                                      : const Color(0xFF1F8F5F),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            _AttendanceLine(
                              label: 'Check In',
                              value: _formatDateTime(activeSession?.checkInAt),
                            ),
                            _AttendanceLine(
                              label: 'Check Out',
                              value: _formatDateTime(activeSession?.checkOutAt),
                            ),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: FilledButton.icon(
                                    onPressed: activeSession == null && !_attendanceBusy
                                        ? _checkIn
                                        : null,
                                    icon: const Icon(Icons.login_rounded),
                                    label: Text(_attendanceBusy ? 'Working...' : 'Check In'),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: activeSession != null && !_attendanceBusy
                                        ? _checkOut
                                        : null,
                                    icon: const Icon(Icons.logout_rounded),
                                    label: const Text('Check Out'),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tracking Status',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    trackingState.isTracking
                        ? 'Tracking is active for job ${trackingState.activeJobId ?? '--'}.'
                        : 'No live tracking session is active.',
                  ),
                  if (trackingState.errorMessage != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      trackingState.errorMessage!,
                      style: const TextStyle(color: Color(0xFF8A1C1C)),
                    ),
                  ],
                  const SizedBox(height: 16),
                  _AttendanceLine(
                    label: 'Tracking Active',
                    value: trackingState.isTracking ? 'Yes' : 'No',
                  ),
                  _AttendanceLine(
                    label: 'Sync In Progress',
                    value: trackingState.isSyncing ? 'Yes' : 'No',
                  ),
                  _AttendanceLine(
                    label: 'Pending Offline Logs',
                    value: '${trackingState.pendingLogsCount}',
                  ),
                  _AttendanceLine(
                    label: 'Last Synced',
                    value: timestamp,
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: !trackingState.isSyncing
                        ? () {
                            ref
                                .read(trackingControllerProvider.notifier)
                                .syncLocation();
                          }
                        : null,
                    icon: const Icon(Icons.gps_fixed_rounded),
                    label: Text(
                      trackingState.isSyncing ? 'Syncing...' : 'Sync Current Location',
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Recent Attendance',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 12),
          if ((_attendance?.recentSessions ?? const <AttendanceSession>[]).isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Text('No attendance sessions recorded yet.'),
              ),
            )
          else
            ..._attendance!.recentSessions.map(
              (session) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                _formatDateTime(session.checkInAt),
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                            ),
                            _AttendanceBadge(
                              label: session.isActive ? 'Open' : 'Closed',
                              color: session.isActive
                                  ? const Color(0xFF1C6DD0)
                                  : const Color(0xFF1F8F5F),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        _AttendanceLine(
                          label: 'Check In',
                          value: _formatDateTime(session.checkInAt),
                        ),
                        _AttendanceLine(
                          label: 'Check Out',
                          value: _formatDateTime(session.checkOutAt),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _AttendanceLine extends StatelessWidget {
  const _AttendanceLine({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF5F6C7B),
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}

class _AttendanceBadge extends StatelessWidget {
  const _AttendanceBadge({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
