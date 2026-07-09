import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../models/mobile_portal_models.dart';

final mobilePortalRepositoryProvider = Provider<MobilePortalRepository>((ref) {
  return MobilePortalRepository(ref.watch(dioProvider));
});

class MobilePortalRepository {
  MobilePortalRepository(this._dio);

  final Dio _dio;

  Future<List<CustomerLookup>> getCustomers() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/customers',
      queryParameters: _queryParameters({
        'status': 'ACTIVE',
        'page': 1,
        'limit': 200,
      }),
    );

    return _pageItems(response.data).map(CustomerLookup.fromJson).toList();
  }

  Future<List<EmployeeLookup>> getEmployees() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/employees',
      queryParameters: _queryParameters({
        'status': 'ACTIVE',
        'page': 1,
        'limit': 200,
      }),
    );

    return _pageItems(response.data).map(EmployeeLookup.fromJson).toList();
  }

  Future<List<BranchLookup>> getBranches() async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/suppliers',
      queryParameters: _queryParameters({
        'status': 'ACTIVE',
        'page': 1,
        'limit': 200,
      }),
    );

    return _pageItems(response.data).map(BranchLookup.fromJson).toList();
  }

  Future<List<LiveMapTechnician>> getLiveMap() async {
    final response = await _dio.get<List<dynamic>>('/admin/live-map');
    final data = response.data ?? const <dynamic>[];

    return data
        .whereType<Map>()
        .map((item) => LiveMapTechnician.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }

  Future<List<OutstandingItem>> getOutstandings({
    String? search,
    String? status,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/outstandings',
      queryParameters: _queryParameters({
        'search': search,
        'status': status,
        'page': 1,
        'limit': 50,
      }),
    );

    return _pageItems(response.data).map(OutstandingItem.fromJson).toList();
  }

  Future<List<AmcItem>> getAmcs({
    String? search,
    String? status,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/amc',
      queryParameters: _queryParameters({
        'search': search,
        'status': status,
        'page': 1,
        'limit': 50,
      }),
    );

    return _pageItems(response.data).map(AmcItem.fromJson).toList();
  }

  Future<List<LeadItem>> getLeads({
    String? search,
    String? status,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/leads',
      queryParameters: _queryParameters({
        'search': search,
        'status': status,
        'page': 1,
        'limit': 50,
      }),
    );

    return _pageItems(response.data).map(LeadItem.fromJson).toList();
  }

  Future<LeadItem> updateLeadStatus({
    required String leadId,
    required String status,
    String? note,
    String? nextFollowUpDate,
  }) async {
    final response = await _dio.patch<Map<String, dynamic>>(
      '/leads/$leadId/status',
      data: {
        'status': status,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        if (nextFollowUpDate != null && nextFollowUpDate.isNotEmpty)
          'nextFollowUpDate': nextFollowUpDate,
      },
    );

    final data = response.data;
    if (data == null) {
      throw StateError('Empty lead status response');
    }

    return LeadItem.fromJson(data);
  }

  Future<void> addLeadNote({
    required String leadId,
    required String note,
  }) async {
    await _dio.post<void>(
      '/leads/$leadId/notes',
      data: {
        'note': note.trim(),
      },
    );
  }

  Future<LedgerPageResult> getLedger({
    String? search,
    String? fromDate,
    String? toDate,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/ledger',
      queryParameters: _queryParameters({
        'search': search,
        'fromDate': fromDate,
        'toDate': toDate,
        'page': 1,
        'limit': 50,
      }),
    );

    final data = response.data;
    if (data == null) {
      throw StateError('Empty ledger response');
    }

    return LedgerPageResult.fromJson(data);
  }

  Future<NotificationListResult> getNotifications({
    bool unreadOnly = false,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/notifications',
      queryParameters: _queryParameters({
        'unreadOnly': unreadOnly,
        'page': page,
        'limit': limit,
      }),
    );

    final data = response.data;
    if (data == null) {
      throw StateError('Empty notifications response');
    }

    return NotificationListResult.fromJson(data);
  }

  Future<void> markNotificationRead(String notificationId) async {
    await _dio.patch<void>('/notifications/$notificationId/read', data: {});
  }

  Future<void> markAllNotificationsRead() async {
    await _dio.patch<void>('/notifications/read-all', data: {});
  }

  Future<AttendanceOverview> getAttendance() async {
    final response = await _dio.get<Map<String, dynamic>>('/attendance/mine');
    final data = response.data;

    if (data == null) {
      throw StateError('Empty attendance response');
    }

    return AttendanceOverview.fromJson(data);
  }

  Future<AttendanceSession> checkIn({
    double? latitude,
    double? longitude,
    double? accuracy,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/attendance/check-in',
      data: {
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
      },
    );

    final data = response.data;
    if (data == null) {
      throw StateError('Empty attendance check-in response');
    }

    return AttendanceSession.fromJson(data);
  }

  Future<AttendanceSession> checkOut({
    double? latitude,
    double? longitude,
    double? accuracy,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/attendance/check-out',
      data: {
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (accuracy != null) 'accuracy': accuracy,
      },
    );

    final data = response.data;
    if (data == null) {
      throw StateError('Empty attendance check-out response');
    }

    return AttendanceSession.fromJson(data);
  }

  List<Map<String, dynamic>> _pageItems(Map<String, dynamic>? response) {
    final data = response?['data'];
    if (data is! List) {
      return const <Map<String, dynamic>>[];
    }

    return data
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  Map<String, dynamic> _queryParameters(Map<String, Object?> input) {
    final params = <String, dynamic>{};

    input.forEach((key, value) {
      if (value == null) {
        return;
      }

      if (value is String && value.trim().isEmpty) {
        return;
      }

      params[key] = value;
    });

    return params;
  }
}
