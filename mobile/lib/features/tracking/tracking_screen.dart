import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'tracking_controller.dart';

class TrackingScreen extends ConsumerWidget {
  const TrackingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trackingState = ref.watch(trackingControllerProvider);
    final timestamp = trackingState.lastSyncedAt == null
        ? 'Pending'
        : DateFormat('dd MMM yyyy, HH:mm').format(trackingState.lastSyncedAt!);
    final statusText = trackingState.isTracking
        ? 'Tracking is active for job ${trackingState.activeJobId ?? '--'}.'
        : 'No live tracking session is active.';

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Live Tracking',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Permission and GPS scaffolding for technician location updates.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Tracking Status',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                Text(statusText),
                if (trackingState.errorMessage != null) ...[
                  const SizedBox(height: 12),
                  Text(
                    trackingState.errorMessage!,
                    style: const TextStyle(color: Color(0xFF8A1C1C)),
                  ),
                ],
                const SizedBox(height: 16),
                Text('Tracking active: ${trackingState.isTracking ? 'Yes' : 'No'}'),
                const SizedBox(height: 6),
                Text('Sync in progress: ${trackingState.isSyncing ? 'Yes' : 'No'}'),
                const SizedBox(height: 6),
                Text('Pending offline logs: ${trackingState.pendingLogsCount}'),
                const SizedBox(height: 6),
                Text('Last synced at: $timestamp'),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: !trackingState.isSyncing
                      ? () {
                          ref
                              .read(trackingControllerProvider.notifier)
                              .syncLocation();
                        }
                      : null,
                  icon: const Icon(Icons.my_location_rounded),
                  label: Text(
                    trackingState.isSyncing ? 'Syncing...' : 'Sync Current Location',
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
