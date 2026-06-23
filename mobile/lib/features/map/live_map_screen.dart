import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/config/app_config.dart';

class LiveMapScreen extends StatelessWidget {
  const LiveMapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    const initialTarget = LatLng(
      AppConfig.defaultMapLatitude,
      AppConfig.defaultMapLongitude,
    );

    return Column(
      children: [
        Expanded(
          child: ClipRRect(
            borderRadius: const BorderRadius.vertical(
              bottom: Radius.circular(24),
            ),
            child: GoogleMap(
              initialCameraPosition: const CameraPosition(
                target: initialTarget,
                zoom: 13,
              ),
              myLocationButtonEnabled: true,
              myLocationEnabled: true,
              markers: {
                Marker(
                  markerId: MarkerId('demo-technician'),
                  position: initialTarget,
                  infoWindow: InfoWindow(
                    title: 'Demo Technician',
                    snippet: 'Latest known location',
                  ),
                ),
              },
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  const Icon(Icons.map_outlined),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Live map shell ready for Socket.IO technician updates.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
