import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

const _trackingLocationSettings = LocationSettings(
  accuracy: LocationAccuracy.high,
  distanceFilter: 25,
);

final currentPositionProvider =
    StreamProvider.autoDispose<Position?>((ref) async* {
  final hasPermission = await ensureLocationPermission();
  if (!hasPermission) {
    yield null;
    return;
  }

  final lastKnownPosition = await Geolocator.getLastKnownPosition();
  if (lastKnownPosition != null) {
    yield lastKnownPosition;
  }

  try {
    final currentPosition = await Geolocator.getCurrentPosition(
      locationSettings: _trackingLocationSettings,
    );
    yield currentPosition;
  } catch (_) {
    if (lastKnownPosition == null) {
      yield null;
    }
  }

  yield* Geolocator.getPositionStream(
    locationSettings: _trackingLocationSettings,
  );
});

Future<bool> ensureLocationPermission() async {
  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    return false;
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }

  return permission != LocationPermission.denied &&
      permission != LocationPermission.deniedForever;
}

Future<Position?> getCurrentDevicePosition() async {
  final hasPermission = await ensureLocationPermission();
  if (!hasPermission) {
    return null;
  }

  try {
    return Geolocator.getCurrentPosition(
      locationSettings: _trackingLocationSettings,
    );
  } catch (_) {
    return Geolocator.getLastKnownPosition();
  }
}
