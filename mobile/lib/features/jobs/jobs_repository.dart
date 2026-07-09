import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../shared/models/technician_job.dart';

final jobsRepositoryProvider = Provider<JobsRepository>((ref) {
  return JobsRepository(ref.watch(dioProvider));
});

class JobsRepository {
  JobsRepository(this._dio);

  final Dio _dio;

  Future<List<TechnicianJob>> getAdminJobs() async {
    final response = await _dio.get<List<dynamic>>('admin/jobs');
    final data = response.data ?? const [];

    return data
        .whereType<Map>()
        .map(
          (job) => TechnicianJob.fromJson(
            Map<String, dynamic>.from(job),
          ),
        )
        .toList();
  }

  Future<List<TechnicianJob>> getTechnicianJobs() async {
    final response = await _dio.get<List<dynamic>>('technician/jobs');
    final data = response.data ?? const [];

    return data
        .whereType<Map>()
        .map(
          (job) => TechnicianJob.fromJson(
            Map<String, dynamic>.from(job),
          ),
        )
        .toList();
  }

  Future<TechnicianJob> getJobDetails(String jobId) async {
    final response = await _dio.get<Map<String, dynamic>>('jobs/$jobId');
    final data = response.data;

    if (data == null) {
      throw const JobsRepositoryException('Empty job details response');
    }

    return TechnicianJob.fromJson(data);
  }

  Future<TechnicianJob> startJob(String jobId) async {
    final response = await _dio.post<Map<String, dynamic>>('jobs/$jobId/start');
    final data = response.data;

    if (data == null) {
      throw const JobsRepositoryException('Empty start job response');
    }

    return TechnicianJob.fromJson(data);
  }

  Future<TechnicianJob> endJob(String jobId) async {
    final response = await _dio.post<Map<String, dynamic>>('jobs/$jobId/end');
    final data = response.data;

    if (data == null) {
      throw const JobsRepositoryException('Empty end job response');
    }

    return TechnicianJob.fromJson(data);
  }

  Future<TechnicianJob> createAdminJob({
    required String jobNumber,
    required String title,
    required String description,
    required String customerId,
    required String scheduledDate,
    String? branchId,
    List<String> assignedMemberIds = const [],
    String? priority,
    String? status,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'admin/jobs',
      data: {
        'jobNumber': jobNumber.trim(),
        'title': title.trim(),
        'description': description.trim(),
        'customerId': customerId,
        'scheduledDate': scheduledDate,
        if (branchId != null && branchId.trim().isNotEmpty)
          'branchId': branchId.trim(),
        if (assignedMemberIds.isNotEmpty) 'assignedMemberIds': assignedMemberIds,
        if (priority != null && priority.trim().isNotEmpty) 'priority': priority,
        if (status != null && status.trim().isNotEmpty) 'status': status,
      },
    );
    final data = response.data;

    if (data == null) {
      throw const JobsRepositoryException('Empty create job response');
    }

    return TechnicianJob.fromJson(data);
  }
}

class JobsRepositoryException implements Exception {
  const JobsRepositoryException(this.message);

  final String message;
}
