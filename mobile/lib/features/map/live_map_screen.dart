import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config/app_config.dart';
import '../location/current_position_provider.dart';

class LiveMapScreen extends ConsumerStatefulWidget {
  const LiveMapScreen({super.key});

  @override
  ConsumerState<LiveMapScreen> createState() => _LiveMapScreenState();
}

class _LiveMapScreenState extends ConsumerState<LiveMapScreen> {
  static const _tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const _userAgentPackageName = 'com.example.field_technician_tracker';

  final MapController _mapController = MapController();
  bool _hasCenteredOnCurrentLocation = false;

  void _moveToPosition(Position position) {
    _mapController.move(
      LatLng(position.latitude, position.longitude),
      16,
    );
  }

  @override
  Widget build(BuildContext context) {
    final positionAsync = ref.watch(currentPositionProvider);
    final position = positionAsync.valueOrNull;
    final currentTarget = position == null
        ? const LatLng(
            AppConfig.defaultMapLatitude,
            AppConfig.defaultMapLongitude,
          )
        : LatLng(position.latitude, position.longitude);

    ref.listen<AsyncValue<Position?>>(currentPositionProvider,
        (previous, next) {
      final nextPosition = next.valueOrNull;
      if (nextPosition == null || _hasCenteredOnCurrentLocation) {
        return;
      }

      _hasCenteredOnCurrentLocation = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) {
          return;
        }

        _moveToPosition(nextPosition);
      });
    });

    return Column(
      children: [
        Expanded(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(28),
              child: Stack(
                children: [
                  FlutterMap(
                    mapController: _mapController,
                    options: MapOptions(
                      initialCenter: currentTarget,
                      initialZoom: position == null ? 13 : 16,
                    ),
                    children: [
                      TileLayer(
                        urlTemplate: _tileUrl,
                        userAgentPackageName: _userAgentPackageName,
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: currentTarget,
                            width: 150,
                            height: 98,
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF173E7A),
                                    borderRadius: BorderRadius.circular(999),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF173E7A)
                                            .withValues(alpha: 0.2),
                                        blurRadius: 18,
                                        offset: const Offset(0, 8),
                                      ),
                                    ],
                                  ),
                                  child: Text(
                                    position == null
                                        ? 'Waiting for GPS'
                                        : 'Your Current Location',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                const Icon(
                                  Icons.my_location_rounded,
                                  size: 36,
                                  color: Color(0xFF1D6FD1),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  Positioned(
                    top: 16,
                    right: 16,
                    child: FloatingActionButton.small(
                      heroTag: 'live-map-current-location',
                      onPressed: position == null
                          ? null
                          : () {
                              _moveToPosition(position);
                            },
                      child: const Icon(Icons.gps_fixed_rounded),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: positionAsync.when(
                data: (value) {
                  if (value == null) {
                    return const _MapStatusCard(
                      icon: Icons.location_disabled_rounded,
                      title: 'GPS not available',
                      subtitle:
                          'Turn on location services and allow permission to see your live position on the map.',
                    );
                  }

                  final timeText = DateFormat('dd MMM, hh:mm a')
                      .format(value.timestamp.toLocal());

                  return Row(
                    children: [
                      const Icon(Icons.pin_drop_rounded),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'GPS tracking active',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Lat ${value.latitude.toStringAsFixed(5)}, Lng ${value.longitude.toStringAsFixed(5)}',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Accuracy ${value.accuracy.toStringAsFixed(0)} m | Updated $timeText',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
                loading: () => const _MapStatusCard(
                  icon: Icons.gps_fixed_rounded,
                  title: 'Finding current location',
                  subtitle: 'The map will move to your GPS position shortly.',
                ),
                error: (_, __) => const _MapStatusCard(
                  icon: Icons.error_outline_rounded,
                  title: 'Unable to read GPS location',
                  subtitle:
                      'Check location permission and device GPS, then reopen the map.',
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MapStatusCard extends StatelessWidget {
  const _MapStatusCard({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
