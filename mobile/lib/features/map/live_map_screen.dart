import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config/app_config.dart';
import '../../core/storage/auth_session.dart';
import '../../shared/models/mobile_portal_models.dart';
import '../../shared/models/technician_job.dart';
import '../../shared/repositories/mobile_portal_repository.dart';
import '../jobs/jobs_provider.dart';
import '../location/current_position_provider.dart';

String _formatDate(DateTime? value, {bool withTime = false}) {
  if (value == null) {
    return '--';
  }

  return DateFormat(withTime ? 'dd MMM yyyy, hh:mm a' : 'dd MMM yyyy')
      .format(value.toLocal());
}

String _formatStatus(String value) {
  if (value.isEmpty) {
    return '--';
  }

  return value
      .split('_')
      .map(
        (part) =>
            '${part.substring(0, 1).toUpperCase()}${part.substring(1).toLowerCase()}',
      )
      .join(' ');
}

Color _statusColor(String status) {
  switch (status) {
    case 'COMPLETED':
    case 'AVAILABLE':
      return const Color(0xFF1F8F5F);
    case 'STARTED':
    case 'IN_PROGRESS':
    case 'ON_JOB':
      return const Color(0xFF1C6DD0);
    case 'TODO':
    case 'PENDING':
    case 'ASSIGNED':
      return const Color(0xFFC77A1F);
    default:
      return const Color(0xFF5A6C7D);
  }
}

class LiveMapScreen extends ConsumerStatefulWidget {
  const LiveMapScreen({super.key});

  @override
  ConsumerState<LiveMapScreen> createState() => _LiveMapScreenState();
}

class _LiveMapScreenState extends ConsumerState<LiveMapScreen> {
  static const _tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const _userAgentPackageName = 'com.example.field_technician_tracker';

  final MapController _mapController = MapController();
  bool _adminLoading = false;
  String? _adminError;
  List<LiveMapTechnician> _technicians = const [];
  String? _selectedTechnicianId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final currentUser = ref.read(currentUserProvider);
      if (currentUser?.isAdmin == true) {
        _loadAdminLiveMap();
      }
    });
  }

  Future<void> _loadAdminLiveMap() async {
    setState(() {
      _adminLoading = true;
      _adminError = null;
    });

    try {
      final technicians = await ref.read(mobilePortalRepositoryProvider).getLiveMap();

      if (!mounted) {
        return;
      }

      setState(() {
        _technicians = technicians;
        _selectedTechnicianId = _resolveSelectedTechnicianId(
          technicians,
          _selectedTechnicianId,
        );
        _adminLoading = false;
      });

      WidgetsBinding.instance.addPostFrameCallback((_) {
        _fitToPoints(_adminRoutePoints(selectedTechnician));
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _adminLoading = false;
        _adminError = _readableError(error);
      });
    }
  }

  LiveMapTechnician? get selectedTechnician {
    if (_technicians.isEmpty) {
      return null;
    }

    if (_selectedTechnicianId == null) {
      return _technicians.first;
    }

    for (final technician in _technicians) {
      if (technician.id == _selectedTechnicianId) {
        return technician;
      }
    }

    return _technicians.first;
  }

  void _fitToPoints(List<LatLng> points) {
    if (points.isEmpty) {
      return;
    }

    if (points.length == 1) {
      _mapController.move(points.first, 14);
      return;
    }

    try {
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: LatLngBounds.fromPoints(points),
          padding: const EdgeInsets.all(36),
        ),
      );
    } catch (_) {
      _mapController.move(points.first, 13);
    }
  }

  List<LatLng> _adminRoutePoints(LiveMapTechnician? technician) {
    if (technician == null) {
      return const [];
    }

    final points = <LatLng>[];

    if (technician.latitude != null && technician.longitude != null) {
      points.add(LatLng(technician.latitude!, technician.longitude!));
    }

    for (final routeJob in technician.todayRouteJobs) {
      if (routeJob.customer.hasCoordinates) {
        points.add(
          LatLng(routeJob.customer.latitude!, routeJob.customer.longitude!),
        );
      }
    }

    return points;
  }

  String? _resolveSelectedTechnicianId(
    List<LiveMapTechnician> technicians,
    String? currentSelection,
  ) {
    if (technicians.isEmpty) {
      return null;
    }

    if (currentSelection != null &&
        technicians.any((technician) => technician.id == currentSelection)) {
      return currentSelection;
    }

    return technicians.first.id;
  }

  List<LatLng> _technicianRoutePoints(
    List<TechnicianJob> jobs,
    Position? currentPosition,
  ) {
    final points = <LatLng>[];

    if (currentPosition != null) {
      points.add(LatLng(currentPosition.latitude, currentPosition.longitude));
    }

    for (final job in jobs) {
      if (_jobHasCoordinates(job)) {
        points.add(LatLng(job.customer.latitude, job.customer.longitude));
      }
    }

    return points;
  }

  bool _jobHasCoordinates(TechnicianJob job) {
    return job.customer.latitude != 0 || job.customer.longitude != 0;
  }

  String _routeStatusFromJob(String status) {
    switch (status) {
      case 'COMPLETED':
        return 'COMPLETED';
      case 'STARTED':
        return 'IN_PROGRESS';
      default:
        return 'TODO';
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider);
    if (currentUser?.isAdmin == true) {
      return _AdminLiveMapView(
        loading: _adminLoading,
        error: _adminError,
        technicians: _technicians,
        selectedTechnician: selectedTechnician,
        selectedTechnicianId: _selectedTechnicianId,
        mapController: _mapController,
        onRefresh: _loadAdminLiveMap,
        onSelectTechnician: (technicianId) {
          setState(() {
            _selectedTechnicianId = technicianId;
          });

          WidgetsBinding.instance.addPostFrameCallback((_) {
            _fitToPoints(_adminRoutePoints(selectedTechnician));
          });
        },
      );
    }

    final jobsAsync = ref.watch(technicianJobsProvider);
    final currentPositionAsync = ref.watch(currentPositionProvider);

    return jobsAsync.when(
      data: (jobs) {
        final currentPosition = currentPositionAsync.valueOrNull;
        final routePoints = _technicianRoutePoints(jobs, currentPosition);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _fitToPoints(routePoints);
        });

        return _TechnicianRouteView(
          jobs: jobs,
          currentPosition: currentPosition,
          mapController: _mapController,
          routeStatusResolver: _routeStatusFromJob,
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _SimpleErrorState(
        message: 'Unable to load your route map.\n$error',
      ),
    );
  }
}

class _AdminLiveMapView extends ConsumerWidget {
  const _AdminLiveMapView({
    required this.loading,
    required this.error,
    required this.technicians,
    required this.selectedTechnician,
    required this.selectedTechnicianId,
    required this.mapController,
    required this.onRefresh,
    required this.onSelectTechnician,
  });

  final bool loading;
  final String? error;
  final List<LiveMapTechnician> technicians;
  final LiveMapTechnician? selectedTechnician;
  final String? selectedTechnicianId;
  final MapController mapController;
  final Future<void> Function() onRefresh;
  final ValueChanged<String> onSelectTechnician;

  List<Marker> _buildTechnicianMarkers() {
    return technicians
        .where((technician) => technician.latitude != null && technician.longitude != null)
        .map(
          (technician) => Marker(
            point: LatLng(technician.latitude!, technician.longitude!),
            width: 150,
            height: 86,
            child: _MapMarkerBubble(
              label: technician.user.name,
              caption: _formatStatus(technician.status),
              color: _statusColor(technician.status),
              icon: Icons.person_pin_circle_rounded,
            ),
          ),
        )
        .toList();
  }

  List<Marker> _buildRouteMarkers() {
    final technician = selectedTechnician;
    if (technician == null) {
      return const [];
    }

    return technician.todayRouteJobs
        .where((job) => job.customer.hasCoordinates)
        .map(
          (job) => Marker(
            point: LatLng(job.customer.latitude!, job.customer.longitude!),
            width: 148,
            height: 92,
            child: _MapMarkerBubble(
              label: job.jobNumber,
              caption: _formatStatus(job.routeStatus),
              color: _statusColor(job.routeStatus),
              icon: job.routeStatus == 'COMPLETED'
                  ? Icons.task_alt_rounded
                  : job.routeStatus == 'IN_PROGRESS'
                      ? Icons.play_circle_fill_rounded
                      : Icons.radio_button_unchecked_rounded,
            ),
          ),
        )
        .toList();
  }

  List<LatLng> _routePolylinePoints() {
    final technician = selectedTechnician;
    if (technician == null) {
      return const [];
    }

    final points = <LatLng>[];

    if (technician.latitude != null && technician.longitude != null) {
      points.add(LatLng(technician.latitude!, technician.longitude!));
    }

    for (final routeJob in technician.todayRouteJobs) {
      if (routeJob.customer.hasCoordinates) {
        points.add(
          LatLng(routeJob.customer.latitude!, routeJob.customer.longitude!),
        );
      }
    }

    return points;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final technician = selectedTechnician;
    final polylinePoints = _routePolylinePoints();
    final initialCenter = technician?.latitude != null && technician?.longitude != null
        ? LatLng(technician!.latitude!, technician.longitude!)
        : const LatLng(
            AppConfig.defaultMapLatitude,
            AppConfig.defaultMapLongitude,
          );

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Admin Live Map',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Track technicians, current locations, and the current-day route plan with live status labels.',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: technicians
                  .map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        selected: selectedTechnicianId == item.id,
                        label: Text(item.user.name),
                        onSelected: (_) => onSelectTechnician(item.id),
                      ),
                    ),
                  )
                  .toList(),
            ),
          ),
          const SizedBox(height: 16),
          AspectRatio(
            aspectRatio: 1.1,
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: loading
                  ? const Center(child: CircularProgressIndicator())
                  : error != null
                      ? _SimpleErrorState(message: error!)
                      : FlutterMap(
                          mapController: mapController,
                          options: MapOptions(
                            initialCenter: initialCenter,
                            initialZoom: technician == null ? 10 : 13,
                          ),
                          children: [
                            TileLayer(
                              urlTemplate: _LiveMapScreenState._tileUrl,
                              userAgentPackageName:
                                  _LiveMapScreenState._userAgentPackageName,
                            ),
                            if (polylinePoints.length >= 2)
                              PolylineLayer(
                                polylines: [
                                  Polyline(
                                    points: polylinePoints,
                                    strokeWidth: 5,
                                    color: const Color(0xFF1D6FD1),
                                  ),
                                ],
                              ),
                            MarkerLayer(
                              markers: [
                                ..._buildTechnicianMarkers(),
                                ..._buildRouteMarkers(),
                              ],
                            ),
                          ],
                        ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              _LegendChip(label: 'TODO', color: Color(0xFFC77A1F)),
              _LegendChip(label: 'IN PROGRESS', color: Color(0xFF1C6DD0)),
              _LegendChip(label: 'COMPLETED', color: Color(0xFF1F8F5F)),
            ],
          ),
          const SizedBox(height: 16),
          if (technician != null) ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            technician.user.name,
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                        ),
                        _StatusPill(
                          label: _formatStatus(technician.status),
                          color: _statusColor(technician.status),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _InfoRow(
                      label: 'Phone',
                      value: technician.phone,
                    ),
                    _InfoRow(
                      label: 'Last Seen',
                      value: _formatDate(technician.lastSeenAt, withTime: true),
                    ),
                    _InfoRow(
                      label: 'Current Job',
                      value: technician.activeJob == null
                          ? 'No active job'
                          : '${technician.activeJob!.jobNumber} | ${technician.activeJob!.title}',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Current Day Route',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 12),
            if (technician.todayRouteJobs.isEmpty)
              const _SimpleEmptyState(
                message: 'No route jobs are scheduled for this technician today.',
              )
            else
              ...technician.todayRouteJobs.map(
                (job) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18),
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
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(fontWeight: FontWeight.w800),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(job.title),
                                  ],
                                ),
                              ),
                              _StatusPill(
                                label: _formatStatus(job.routeStatus),
                                color: _statusColor(job.routeStatus),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          _InfoRow(label: 'Customer', value: job.customer.name),
                          _InfoRow(label: 'Address', value: job.customer.address),
                          _InfoRow(
                            label: 'Scheduled',
                            value: _formatDate(job.scheduledDate),
                          ),
                          const SizedBox(height: 10),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton.icon(
                              onPressed: () => context.push('/jobs/${job.id}'),
                              icon: const Icon(Icons.open_in_new_rounded),
                              label: const Text('Open Job'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _TechnicianRouteView extends StatelessWidget {
  const _TechnicianRouteView({
    required this.jobs,
    required this.currentPosition,
    required this.mapController,
    required this.routeStatusResolver,
  });

  final List<TechnicianJob> jobs;
  final Position? currentPosition;
  final MapController mapController;
  final String Function(String status) routeStatusResolver;

  bool _hasCoordinates(TechnicianJob job) {
    return job.customer.latitude != 0 || job.customer.longitude != 0;
  }

  @override
  Widget build(BuildContext context) {
    TechnicianJob? currentJob;
    for (final job in jobs) {
      if (job.status == 'STARTED') {
        currentJob = job;
        break;
      }
    }
    currentJob ??= jobs.isEmpty ? null : jobs.first;
    final activeJob = currentJob;
    final completedCount =
        jobs.where((job) => routeStatusResolver(job.status) == 'COMPLETED').length;
    final inProgressCount =
        jobs.where((job) => routeStatusResolver(job.status) == 'IN_PROGRESS').length;
    final todoCount =
        jobs.where((job) => routeStatusResolver(job.status) == 'TODO').length;
    final initialCenter = currentPosition == null
        ? jobs.isNotEmpty && _hasCoordinates(jobs.first)
            ? LatLng(jobs.first.customer.latitude, jobs.first.customer.longitude)
            : const LatLng(
                AppConfig.defaultMapLatitude,
                AppConfig.defaultMapLongitude,
              )
        : LatLng(currentPosition!.latitude, currentPosition!.longitude);

    final routePoints = <LatLng>[
      if (currentPosition != null)
        LatLng(currentPosition!.latitude, currentPosition!.longitude),
      ...jobs
          .where(_hasCoordinates)
          .map((job) => LatLng(job.customer.latitude, job.customer.longitude)),
    ];

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Today Route',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'See your current-day route, quick job menu, and the next place you need to visit.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 16),
        AspectRatio(
          aspectRatio: 1.1,
          child: Card(
            clipBehavior: Clip.antiAlias,
            child: FlutterMap(
              mapController: mapController,
              options: MapOptions(
                initialCenter: initialCenter,
                initialZoom: 13,
              ),
              children: [
                TileLayer(
                  urlTemplate: _LiveMapScreenState._tileUrl,
                  userAgentPackageName:
                      _LiveMapScreenState._userAgentPackageName,
                ),
                if (routePoints.length >= 2)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: routePoints,
                        strokeWidth: 5,
                        color: const Color(0xFF1D6FD1),
                      ),
                    ],
                  ),
                MarkerLayer(
                  markers: [
                    if (currentPosition != null)
                      Marker(
                        point: LatLng(
                          currentPosition!.latitude,
                          currentPosition!.longitude,
                        ),
                        width: 140,
                        height: 84,
                        child: const _MapMarkerBubble(
                          label: 'Current Location',
                          caption: 'Live GPS',
                          color: Color(0xFF1C6DD0),
                          icon: Icons.my_location_rounded,
                        ),
                      ),
                    ...jobs.where(_hasCoordinates).map(
                      (job) => Marker(
                        point: LatLng(job.customer.latitude, job.customer.longitude),
                        width: 146,
                        height: 90,
                        child: _MapMarkerBubble(
                          label: job.jobNumber,
                          caption: _formatStatus(routeStatusResolver(job.status)),
                          color: _statusColor(routeStatusResolver(job.status)),
                          icon: routeStatusResolver(job.status) == 'COMPLETED'
                              ? Icons.task_alt_rounded
                              : routeStatusResolver(job.status) == 'IN_PROGRESS'
                                  ? Icons.play_circle_fill_rounded
                                  : Icons.radio_button_unchecked_rounded,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            _RouteStatCard(
              label: 'TODO',
              count: todoCount,
              color: const Color(0xFFFFF1E1),
            ),
            _RouteStatCard(
              label: 'IN PROGRESS',
              count: inProgressCount,
              color: const Color(0xFFE8F2FF),
            ),
            _RouteStatCard(
              label: 'COMPLETED',
              count: completedCount,
              color: const Color(0xFFEAF7EF),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (activeJob != null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Current Job',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    '${activeJob.jobNumber} | ${activeJob.title}',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 10),
                  _InfoRow(label: 'Customer', value: activeJob.customer.name),
                  _InfoRow(label: 'Address', value: activeJob.customer.address),
                  _InfoRow(
                    label: 'Team',
                    value: activeJob.assignedMemberSummary,
                  ),
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () => context.push('/jobs/${activeJob.id}'),
                      icon: const Icon(Icons.open_in_new_rounded),
                      label: const Text('Open Job'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
        Text(
          'Job Menu',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 12),
        if (jobs.isEmpty)
          const _SimpleEmptyState(
            message: 'No jobs are visible for the technician right now.',
          )
        else
          ...jobs.map(
            (job) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text(
                    '${job.jobNumber} | ${job.title}',
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      '${job.customer.name}\n${_formatDate(job.scheduledDate)} | ${_formatStatus(routeStatusResolver(job.status))}',
                    ),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => context.push('/jobs/${job.id}'),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _RouteStatCard extends StatelessWidget {
  const _RouteStatCard({
    required this.label,
    required this.count,
    required this.color,
  });

  final String label;
  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 110,
      child: Card(
        color: color,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                '$count',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MapMarkerBubble extends StatelessWidget {
  const _MapMarkerBubble({
    required this.label,
    required this.caption,
    required this.color,
    required this.icon,
  });

  final String label;
  final String caption;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          constraints: const BoxConstraints(maxWidth: 138),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.12),
                blurRadius: 14,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                caption,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 10,
                  color: color,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Icon(icon, color: color, size: 34),
      ],
    );
  }
}

class _LegendChip extends StatelessWidget {
  const _LegendChip({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
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

class _StatusPill extends StatelessWidget {
  const _StatusPill({
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

class _InfoRow extends StatelessWidget {
  const _InfoRow({
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF5F6C7B),
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}

class _SimpleEmptyState extends StatelessWidget {
  const _SimpleEmptyState({
    required this.message,
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Text(
          message,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ),
    );
  }
}

class _SimpleErrorState extends StatelessWidget {
  const _SimpleErrorState({
    required this.message,
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          message,
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}

String _readableError(Object error) {
  if (error is Exception) {
    return error.toString().replaceFirst('Exception: ', '');
  }

  return 'Unable to load map data.';
}
