import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../tracking/tracking_controller.dart';
import 'jobs_provider.dart';
import 'jobs_repository.dart';

class JobDetailScreen extends ConsumerStatefulWidget {
  const JobDetailScreen({
    super.key,
    required this.jobId,
  });

  final String jobId;

  @override
  ConsumerState<JobDetailScreen> createState() => _JobDetailScreenState();
}

class _JobDetailScreenState extends ConsumerState<JobDetailScreen> {
  bool _isStarting = false;
  bool _isEnding = false;

  Future<void> _startJob() async {
    setState(() {
      _isStarting = true;
    });

    try {
      await ref.read(jobsRepositoryProvider).startJob(widget.jobId);
      ref.invalidate(jobDetailsProvider(widget.jobId));
      ref.invalidate(technicianJobsProvider);

      final trackingStarted = await ref
          .read(trackingControllerProvider.notifier)
          .startTracking(jobId: widget.jobId);

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            trackingStarted
                ? 'Job started and live tracking enabled'
                : 'Job started, but live tracking could not be enabled',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to start job: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isStarting = false;
        });
      }
    }
  }

  Future<void> _endJob() async {
    setState(() {
      _isEnding = true;
    });

    try {
      await ref.read(jobsRepositoryProvider).endJob(widget.jobId);
      await ref.read(trackingControllerProvider.notifier).stopTracking();
      ref.invalidate(jobDetailsProvider(widget.jobId));
      ref.invalidate(technicianJobsProvider);

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Job completed and live tracking stopped'),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to end job: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isEnding = false;
        });
      }
    }
  }

  Future<void> _openNavigation(double latitude, double longitude) async {
    final uri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1&destination=$latitude,$longitude&travelmode=driving',
    );

    final launched = await launchUrl(
      uri,
      mode: LaunchMode.externalApplication,
    );

    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to open navigation app'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final trackingState = ref.watch(trackingControllerProvider);
    final jobDetails = ref.watch(jobDetailsProvider(widget.jobId));
    final dateFormat = DateFormat('dd MMM yyyy, hh:mm a');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Details'),
      ),
      body: jobDetails.when(
        data: (job) {
          final canStart = !_isStarting &&
              job.status != 'STARTED' &&
              job.status != 'COMPLETED' &&
              job.status != 'CANCELLED';
          final canEnd = !_isEnding && job.status == 'STARTED';

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        job.title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Job Number: ${job.jobNumber}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      Text('Customer: ${job.customer.name}'),
                      const SizedBox(height: 8),
                      Text('Customer Phone: ${job.customer.phone}'),
                      const SizedBox(height: 8),
                      Text('Address: ${job.customer.address}'),
                      const SizedBox(height: 8),
                      Text(
                        'Scheduled: ${dateFormat.format(job.scheduledDate.toLocal())}',
                      ),
                      const SizedBox(height: 8),
                      Text('Status: ${job.status}'),
                      if (trackingState.isTracking &&
                          trackingState.activeJobId == widget.jobId) ...[
                        const SizedBox(height: 8),
                        Text(
                          trackingState.lastSyncedAt == null
                              ? 'Live tracking is active'
                              : 'Live tracking active. Last sync: ${dateFormat.format(trackingState.lastSyncedAt!.toLocal())}',
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      height: 220,
                      child: IgnorePointer(
                        child: GoogleMap(
                          initialCameraPosition: CameraPosition(
                            target: LatLng(
                              job.customer.latitude,
                              job.customer.longitude,
                            ),
                            zoom: 15,
                          ),
                          markers: {
                            Marker(
                              markerId: MarkerId(job.customer.id),
                              position: LatLng(
                                job.customer.latitude,
                                job.customer.longitude,
                              ),
                              infoWindow: InfoWindow(
                                title: job.customer.name,
                                snippet: job.customer.address,
                              ),
                            ),
                          },
                          myLocationButtonEnabled: false,
                          zoomControlsEnabled: false,
                          mapToolbarEnabled: false,
                        ),
                      ),
                    ),
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
                        'Description',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      Text(job.description),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: canStart ? _startJob : null,
                icon: _isStarting
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.play_arrow_rounded),
                label: Text(_isStarting ? 'Starting...' : 'Start Job'),
              ),
              const SizedBox(height: 12),
              FilledButton.tonalIcon(
                onPressed: canEnd ? _endJob : null,
                icon: _isEnding
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.stop_circle_outlined),
                label: Text(_isEnding ? 'Ending...' : 'End Job'),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {
                  _openNavigation(
                    job.customer.latitude,
                    job.customer.longitude,
                  );
                },
                icon: const Icon(Icons.navigation_outlined),
                label: const Text('Navigate'),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  context.go('/jobs');
                },
                child: const Text('Back to Job List'),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline_rounded, size: 40),
                  const SizedBox(height: 12),
                  Text(
                    'Unable to load job details',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '$error',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: () {
                      ref.invalidate(jobDetailsProvider(widget.jobId));
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
