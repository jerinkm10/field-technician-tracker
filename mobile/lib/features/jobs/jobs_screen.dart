import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../shared/models/technician_job.dart';
import 'jobs_provider.dart';

class JobListScreen extends ConsumerWidget {
  const JobListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(technicianJobsProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(technicianJobsProvider);
        await ref.read(technicianJobsProvider.future);
      },
      child: jobsAsync.when(
        data: (jobs) {
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'Assigned Jobs',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Today and upcoming site visits for the technician.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 20),
              if (jobs.isEmpty)
                const _EmptyJobsState()
              else
                for (final job in jobs) _JobCard(job: job),
            ],
          );
        },
        loading: () => ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          children: const [
            SizedBox(height: 120),
            Center(child: CircularProgressIndicator()),
          ],
        ),
        error: (error, _) {
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            children: [
              const SizedBox(height: 120),
              Icon(
                Icons.cloud_off_rounded,
                size: 48,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 12),
              Text(
                'Unable to load jobs',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                '$error',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 16),
              Center(
                child: FilledButton(
                  onPressed: () {
                    ref.invalidate(technicianJobsProvider);
                  },
                  child: const Text('Retry'),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard({
    required this.job,
  });

  final TechnicianJob job;

  @override
  Widget build(BuildContext context) {
    final scheduleFormat = DateFormat('dd MMM, hh:mm a');
    final timeFormat = DateFormat('hh:mm a');
    final statusText = _formatStatus(job.status);
    final teamName = job.technician?.user.name.isNotEmpty == true
        ? job.technician!.user.name
        : 'Unassigned';
    final isCompleted = job.status == 'COMPLETED';
    final backgroundColor =
        isCompleted ? const Color(0xFFE8F7EC) : Colors.white;
    final borderColor =
        isCompleted ? const Color(0xFF84C79A) : const Color(0xFFE5ECF3);
    final secondaryStartLabel =
        job.startedAt == null ? 'Scheduled Start' : 'Started';
    final secondaryEndText = job.completedAt == null
        ? (job.status == 'COMPLETED' ? '--' : 'Pending')
        : timeFormat.format(job.completedAt!.toLocal());

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: backgroundColor,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(color: borderColor),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: () {
          context.push('/jobs/${job.id}');
        },
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          job.jobNumber,
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          job.title,
                          style:
                              Theme.of(context).textTheme.bodyLarge?.copyWith(
                                    color: const Color(0xFF1B2A41),
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  Chip(
                    label: Text(statusText),
                    backgroundColor: isCompleted
                        ? const Color(0xFFD2EED9)
                        : const Color(0xFFF2F6FA),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text(
                job.customer.name,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 6),
              Text(
                job.customer.address,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 10),
              Text(
                'Team: $teamName',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF355070),
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 12),
              Text(
                'Scheduled: ${scheduleFormat.format(job.scheduledDate.toLocal())}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _TimeInfoChip(
                      label: secondaryStartLabel,
                      value: timeFormat.format(
                        (job.startedAt ?? job.scheduledDate).toLocal(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _TimeInfoChip(
                      label: 'End',
                      value: secondaryEndText,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () {
                    context.push('/jobs/${job.id}');
                  },
                  icon: const Icon(Icons.arrow_forward_rounded),
                  label: const Text('View Details'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TimeInfoChip extends StatelessWidget {
  const _TimeInfoChip({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFD9E4EE)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF52667A),
                ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

class _EmptyJobsState extends StatelessWidget {
  const _EmptyJobsState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 80),
      child: Column(
        children: [
          Icon(
            Icons.assignment_turned_in_outlined,
            size: 48,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 12),
          Text(
            'No jobs assigned right now',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text(
            'Pull to refresh when new work is assigned.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}

String _formatStatus(String status) {
  if (status.isEmpty) {
    return '--';
  }

  return status
      .split('_')
      .map(
        (part) =>
            '${part.substring(0, 1).toUpperCase()}${part.substring(1).toLowerCase()}',
      )
      .join(' ');
}
