import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../../features/location/current_position_provider.dart';
import '../../core/storage/auth_session.dart';
import '../../shared/models/technician_job.dart';
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
  static const _tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const _userAgentPackageName = 'com.example.field_technician_tracker';
  static const _autoBoundaryMeters = 1000.0;

  final MapController _mapController = MapController();

  bool _isStarting = false;
  bool _isEnding = false;
  bool _isRouteLoading = false;
  bool _hasFittedInitialCamera = false;
  _RouteData? _routeData;
  String? _lastAutoActionType;
  DateTime? _lastAutoActionAt;

  Future<void> _startJob({
    bool triggeredAutomatically = false,
  }) async {
    if (_isStarting) {
      return;
    }

    setState(() {
      _isStarting = true;
    });

    try {
      final locationSynced =
          await ref.read(trackingControllerProvider.notifier).syncLocation(
                jobId: widget.jobId,
                requireOnline: true,
              );
      if (!locationSynced) {
        throw const JobsRepositoryException(
          'Current GPS location could not be synced. Check internet and GPS.',
        );
      }

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
            triggeredAutomatically
                ? trackingStarted
                    ? 'You are within 1 km. Job started automatically.'
                    : 'You are within 1 km. Job started, but live tracking could not be enabled.'
                : trackingStarted
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

  Future<void> _endJob({
    bool triggeredAutomatically = false,
  }) async {
    if (_isEnding) {
      return;
    }

    setState(() {
      _isEnding = true;
    });

    try {
      final locationSynced =
          await ref.read(trackingControllerProvider.notifier).syncLocation(
                jobId: widget.jobId,
                requireOnline: true,
              );
      if (!locationSynced) {
        throw const JobsRepositoryException(
          'Current GPS location could not be synced. Check internet and GPS.',
        );
      }

      await ref.read(jobsRepositoryProvider).endJob(widget.jobId);
      await ref.read(trackingControllerProvider.notifier).stopTracking();
      ref.invalidate(jobDetailsProvider(widget.jobId));
      ref.invalidate(technicianJobsProvider);

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            triggeredAutomatically
                ? 'You moved more than 1 km away. Job ended automatically.'
                : 'Job completed and live tracking stopped',
          ),
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

  Future<void> _showRouteToCustomer(
    TechnicianJob job,
    Position? currentPosition,
  ) async {
    final livePosition = currentPosition ?? await getCurrentDevicePosition();
    if (livePosition == null) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Current location is not available yet'),
        ),
      );
      return;
    }

    setState(() {
      _isRouteLoading = true;
    });

    try {
      final routeData = await _fetchRouteData(
        originLatitude: livePosition.latitude,
        originLongitude: livePosition.longitude,
        destinationLatitude: job.customer.latitude,
        destinationLongitude: job.customer.longitude,
      );

      if (routeData == null) {
        throw const JobsRepositoryException(
          'No route could be generated for this job.',
        );
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _routeData = routeData;
      });

      _fitMapToPoints(routeData.points);
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to load route: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isRouteLoading = false;
        });
      }
    }
  }

  Future<_RouteData?> _fetchRouteData({
    required double originLatitude,
    required double originLongitude,
    required double destinationLatitude,
    required double destinationLongitude,
  }) async {
    final dio = Dio(
      BaseOptions(
        baseUrl: 'https://router.project-osrm.org',
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );

    final response = await dio.get<Map<String, dynamic>>(
      '/route/v1/driving/$originLongitude,$originLatitude;$destinationLongitude,$destinationLatitude',
      queryParameters: const {
        'overview': 'full',
        'geometries': 'geojson',
        'steps': false,
      },
    );

    final routes = response.data?['routes'];
    if (routes is! List || routes.isEmpty) {
      return null;
    }

    final route = routes.first;
    if (route is! Map) {
      return null;
    }

    final geometry = route['geometry'];
    if (geometry is! Map) {
      return null;
    }

    final coordinates = geometry['coordinates'];
    if (coordinates is! List) {
      return null;
    }

    final points = coordinates
        .whereType<List>()
        .where((coordinate) => coordinate.length >= 2)
        .map(
          (coordinate) => LatLng(
            (coordinate[1] as num).toDouble(),
            (coordinate[0] as num).toDouble(),
          ),
        )
        .toList();

    if (points.length < 2) {
      return null;
    }

    return _RouteData(
      points: points,
      distanceMeters: (route['distance'] as num?)?.toDouble(),
      durationSeconds: (route['duration'] as num?)?.toDouble(),
    );
  }

  void _handleAutomaticActions(TechnicianJob job, Position? position) {
    if (position == null || _isStarting || _isEnding) {
      return;
    }

    final distanceToCustomer = Geolocator.distanceBetween(
      position.latitude,
      position.longitude,
      job.customer.latitude,
      job.customer.longitude,
    );

    final canStart = job.status != 'STARTED' &&
        job.status != 'COMPLETED' &&
        job.status != 'CANCELLED';
    final canEnd = job.status == 'STARTED';

    if (canStart &&
        distanceToCustomer <= _autoBoundaryMeters &&
        !_isAutoActionThrottled('start')) {
      _markAutoAction('start');
      unawaited(_startJob(triggeredAutomatically: true));
      return;
    }

    if (canEnd &&
        distanceToCustomer > _autoBoundaryMeters &&
        !_isAutoActionThrottled('end')) {
      _markAutoAction('end');
      unawaited(_endJob(triggeredAutomatically: true));
    }
  }

  bool _isAutoActionThrottled(String actionType) {
    if (_lastAutoActionType != actionType || _lastAutoActionAt == null) {
      return false;
    }

    return DateTime.now().difference(_lastAutoActionAt!) <
        const Duration(seconds: 20);
  }

  void _markAutoAction(String actionType) {
    _lastAutoActionType = actionType;
    _lastAutoActionAt = DateTime.now();
  }

  void _maybeFitInitialCamera(
    TechnicianJob job,
    Position? currentPosition,
  ) {
    if (_hasFittedInitialCamera || currentPosition == null) {
      return;
    }

    _hasFittedInitialCamera = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) {
        return;
      }

      _fitMapToPoints([
        LatLng(currentPosition.latitude, currentPosition.longitude),
        LatLng(job.customer.latitude, job.customer.longitude),
      ]);
    });
  }

  void _fitMapToPoints(List<LatLng> points) {
    if (points.isEmpty) {
      return;
    }

    final bounds = LatLngBounds.fromPoints(points);
    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: bounds,
        padding: const EdgeInsets.all(32),
      ),
    );
  }

  double? _resolveDistanceToCustomer(
    TechnicianJob job,
    Position? currentPosition,
  ) {
    if (currentPosition != null) {
      return Geolocator.distanceBetween(
        currentPosition.latitude,
        currentPosition.longitude,
        job.customer.latitude,
        job.customer.longitude,
      );
    }

    final technician = job.technician;
    if (technician?.currentLatitude == null ||
        technician?.currentLongitude == null) {
      return null;
    }

    return Geolocator.distanceBetween(
      technician!.currentLatitude!,
      technician.currentLongitude!,
      job.customer.latitude,
      job.customer.longitude,
    );
  }

  double? _resolveTravelDistance(
    TechnicianJob job,
    Position? currentPosition,
  ) {
    final latestVisit = job.latestVisit;
    if (latestVisit?.startLatitude == null ||
        latestVisit?.startLongitude == null) {
      return null;
    }

    final endLatitude = latestVisit?.endLatitude ?? currentPosition?.latitude;
    final endLongitude =
        latestVisit?.endLongitude ?? currentPosition?.longitude;

    if (endLatitude == null || endLongitude == null) {
      return null;
    }

    return Geolocator.distanceBetween(
      latestVisit!.startLatitude!,
      latestVisit.startLongitude!,
      endLatitude,
      endLongitude,
    );
  }

  String _formatDateTime(DateTime? value) {
    if (value == null) {
      return '--';
    }

    return DateFormat('dd MMM yyyy, hh:mm a').format(value.toLocal());
  }

  String _formatDistance(double? meters) {
    if (meters == null) {
      return '--';
    }

    if (meters < 1000) {
      return '${meters.toStringAsFixed(0)} m';
    }

    return '${(meters / 1000).toStringAsFixed(2)} km';
  }

  String _formatDuration(double? seconds) {
    if (seconds == null) {
      return '--';
    }

    final totalMinutes = (seconds / 60).round();
    if (totalMinutes < 60) {
      return '$totalMinutes min';
    }

    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    if (minutes == 0) {
      return '$hours hr';
    }

    return '$hours hr $minutes min';
  }

  String _formatSiteTime(JobVisit? visit) {
    if (visit == null) {
      return '--';
    }

    if (visit.timeSpentMinutes != null) {
      final minutes = visit.timeSpentMinutes!;
      if (minutes < 60) {
        return '$minutes min';
      }

      final hours = minutes ~/ 60;
      final remainingMinutes = minutes % 60;
      if (remainingMinutes == 0) {
        return '$hours hr';
      }

      return '$hours hr $remainingMinutes min';
    }

    if (visit.checkInAt != null && visit.checkOutAt == null) {
      final elapsed = DateTime.now().difference(visit.checkInAt!);
      return _formatDuration(elapsed.inSeconds.toDouble());
    }

    return '--';
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

  @override
  Widget build(BuildContext context) {
    final trackingState = ref.watch(trackingControllerProvider);
    final jobDetails = ref.watch(jobDetailsProvider(widget.jobId));
    final currentPositionAsync = ref.watch(currentPositionProvider);
    final currentUser = ref.watch(currentUserProvider);
    final canControlJob = currentUser?.isTechnician == true;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Job Details'),
      ),
      body: jobDetails.when(
        data: (job) {
          final currentPosition = currentPositionAsync.valueOrNull;
          final customerPoint = LatLng(
            job.customer.latitude,
            job.customer.longitude,
          );
          final currentDistance = _resolveDistanceToCustomer(
            job,
            currentPosition,
          );
          final travelDistance = _resolveTravelDistance(
            job,
            currentPosition,
          );
          final latestVisit = job.latestVisit;
          final canStart = !_isStarting &&
              canControlJob &&
              job.status != 'STARTED' &&
              job.status != 'COMPLETED' &&
              job.status != 'CANCELLED';
          final canEnd = !_isEnding && canControlJob && job.status == 'STARTED';
          final teamName = job.assignedMemberSummary;
          final routeSummaryDistance =
              _routeData?.distanceMeters ?? currentDistance;

          if (canControlJob) {
            ref.listen<AsyncValue<Position?>>(currentPositionProvider,
                (previous, next) {
              _handleAutomaticActions(job, next.valueOrNull);
            });
          }

          _maybeFitInitialCamera(job, currentPosition);

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Card(
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
                                  job.title,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleLarge
                                      ?.copyWith(
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Job Number: ${job.jobNumber}',
                                  style:
                                      Theme.of(context).textTheme.titleMedium,
                                ),
                              ],
                            ),
                          ),
                          Chip(
                            label: Text(_formatStatus(job.status)),
                            backgroundColor: job.status == 'COMPLETED'
                                ? const Color(0xFFD8F0DF)
                                : const Color(0xFFF1F5F9),
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      _DetailLine(
                        label: 'Customer Name',
                        value: job.customer.name,
                      ),
                      _DetailLine(
                        label: 'Customer Phone',
                        value: job.customer.phone,
                      ),
                      _DetailLine(
                        label: 'Address',
                        value: job.customer.address,
                      ),
                      _DetailLine(
                        label: 'Scheduled Time',
                        value: _formatDateTime(job.scheduledDate),
                      ),
                      _DetailLine(
                        label: 'Team',
                        value: teamName,
                      ),
                      _DetailLine(
                        label: 'Start Time',
                        value: _formatDateTime(job.startedAt),
                      ),
                      _DetailLine(
                        label: 'End Time',
                        value: _formatDateTime(job.completedAt),
                      ),
                      if (trackingState.isTracking &&
                          trackingState.activeJobId == widget.jobId) ...[
                        const SizedBox(height: 10),
                        Text(
                          trackingState.lastSyncedAt == null
                              ? 'Live tracking is active'
                              : 'Live tracking active. Last sync: ${_formatDateTime(trackingState.lastSyncedAt)}',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: const Color(0xFF1D5E93),
                                    fontWeight: FontWeight.w600,
                                  ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _MetricCard(
                    label: 'Distance to Customer',
                    value: _formatDistance(currentDistance),
                    helper: 'Auto start under 1 km',
                    color: const Color(0xFFEAF4FF),
                  ),
                  _MetricCard(
                    label: 'Route Distance',
                    value: _formatDistance(routeSummaryDistance),
                    helper: _routeData == null
                        ? 'Tap Navigate to show route'
                        : _formatDuration(_routeData!.durationSeconds),
                    color: const Color(0xFFF6F4FF),
                  ),
                  _MetricCard(
                    label: 'Travel Distance',
                    value: _formatDistance(travelDistance),
                    helper: 'From job check-in point',
                    color: const Color(0xFFFFF4EA),
                  ),
                  _MetricCard(
                    label: 'Time on Site',
                    value: _formatSiteTime(latestVisit),
                    helper: latestVisit?.checkInAt == null
                        ? 'Starts after check-in'
                        : 'Based on visit record',
                    color: const Color(0xFFEFFAF3),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: SizedBox(
                      height: 260,
                      child: FlutterMap(
                        mapController: _mapController,
                        options: MapOptions(
                          initialCenter: customerPoint,
                          initialZoom: 15,
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: _tileUrl,
                            userAgentPackageName: _userAgentPackageName,
                          ),
                          if (_routeData != null)
                            PolylineLayer(
                              polylines: [
                                Polyline(
                                  points: _routeData!.points,
                                  strokeWidth: 5,
                                  color: const Color(0xFF1D6FD1),
                                ),
                              ],
                            ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: customerPoint,
                                width: 148,
                                height: 88,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius:
                                            BorderRadius.circular(999),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black
                                                .withValues(alpha: 0.12),
                                            blurRadius: 12,
                                            offset: const Offset(0, 6),
                                          ),
                                        ],
                                      ),
                                      child: Text(
                                        job.customer.name,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          color: Color(0xFF17324D),
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    const Icon(
                                      Icons.location_on_rounded,
                                      size: 36,
                                      color: Color(0xFF1D6FD1),
                                    ),
                                  ],
                                ),
                              ),
                              if (currentPosition != null)
                                Marker(
                                  point: LatLng(
                                    currentPosition.latitude,
                                    currentPosition.longitude,
                                  ),
                                  width: 128,
                                  height: 76,
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 10,
                                          vertical: 6,
                                        ),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF173E7A),
                                          borderRadius:
                                              BorderRadius.circular(999),
                                        ),
                                        child: const Text(
                                          'Current Location',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      const Icon(
                                        Icons.my_location_rounded,
                                        size: 32,
                                        color: Color(0xFF0E6BA8),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ],
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
                      Text(
                        job.description.isEmpty
                            ? 'No job description available.'
                            : job.description,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              if (canControlJob) ...[
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
              ],
              OutlinedButton.icon(
                onPressed: _isRouteLoading
                    ? null
                    : () {
                        _showRouteToCustomer(job, currentPosition);
                      },
                icon: _isRouteLoading
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.navigation_outlined),
                label: Text(_isRouteLoading ? 'Loading Route...' : 'Navigate'),
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

class _DetailLine extends StatelessWidget {
  const _DetailLine({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF52667A),
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.helper,
    required this.color,
  });

  final String label;
  final String value;
  final String helper;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 164,
      child: Card(
        color: color,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF52667A),
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
              const SizedBox(height: 6),
              Text(
                helper,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RouteData {
  const _RouteData({
    required this.points,
    required this.distanceMeters,
    required this.durationSeconds,
  });

  final List<LatLng> points;
  final double? distanceMeters;
  final double? durationSeconds;
}
