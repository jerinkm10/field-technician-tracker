import 'package:hive_flutter/hive_flutter.dart';
import '../../shared/models/app_user.dart';

class AppLocalStorage {
  AppLocalStorage._();

  static const _boxName = 'field_technician_tracker_box';
  static const _authTokenKey = 'auth_token';
  static const _currentUserKey = 'current_user';
  static const _pendingTrackingLogsKey = 'pending_tracking_logs';

  static Future<void> initialize() async {
    await Hive.initFlutter();
    await Hive.openBox<dynamic>(_boxName);
  }

  static Box<dynamic> get _box => Hive.box<dynamic>(_boxName);

  static String? getAuthToken() {
    return _box.get(_authTokenKey) as String?;
  }

  static Future<void> saveAuthToken(String token) async {
    await _box.put(_authTokenKey, token);
  }

  static Future<void> clearAuthToken() async {
    await _box.delete(_authTokenKey);
  }

  static AppUser? getCurrentUser() {
    final rawUser = _box.get(_currentUserKey);
    if (rawUser is! Map) {
      return null;
    }

    return AppUser.fromJson(Map<String, dynamic>.from(rawUser));
  }

  static Future<void> saveCurrentUser(AppUser user) async {
    await _box.put(_currentUserKey, user.toJson());
  }

  static Future<void> clearCurrentUser() async {
    await _box.delete(_currentUserKey);
  }

  static Future<void> clearSession() async {
    await Future.wait([
      clearAuthToken(),
      clearCurrentUser(),
    ]);
  }

  static List<Map<String, dynamic>> getPendingTrackingLogs() {
    final rawLogs = _box.get(
      _pendingTrackingLogsKey,
      defaultValue: const <dynamic>[],
    );

    if (rawLogs is! List) {
      return const <Map<String, dynamic>>[];
    }

    return rawLogs
        .whereType<Map>()
        .map((log) => Map<String, dynamic>.from(log))
        .toList();
  }

  static Future<void> savePendingTrackingLogs(
    List<Map<String, dynamic>> logs,
  ) async {
    await _box.put(_pendingTrackingLogsKey, logs);
  }

  static Future<void> addPendingTrackingLog(
    Map<String, dynamic> log,
  ) async {
    final logs = getPendingTrackingLogs()..add(log);
    await savePendingTrackingLogs(logs);
  }

  static Future<void> clearPendingTrackingLogs() async {
    await _box.delete(_pendingTrackingLogsKey);
  }
}
