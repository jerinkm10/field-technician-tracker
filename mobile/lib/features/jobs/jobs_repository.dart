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

  Future<List<TechnicianJob>> getTechnicianJobs() async {
    final response = await _dio.get<List<dynamic>>('/technician/jobs');
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
    final response = await _dio.get<Map<String, dynamic>>('/jobs/$jobId');
    final data = response.data;

    if (data == null) {
      throw const JobsRepositoryException('Empty job details response');
    }

    return TechnicianJob.fromJson(data);
  }

  Future<TechnicianJob> startJob(String jobId) async {
    final response = await _dio.post<Map<String, dynamic>>('/jobs/$jobId/start');
    final data = response.data;

    if (data == null) {
      throw const JobsRepositoryException('Empty start job response');
    }

    return TechnicianJob.fromJson(data);
  }

  Future<TechnicianJob> endJob(String jobId) async {
    final response = await _dio.post<Map<String, dynamic>>('/jobs/$jobId/end');
    final data = response.data;

    if (data == null) {
      throw const JobsRepositoryException('Empty end job response');
    }

    return TechnicianJob.fromJson(data);
  }
}

class JobsRepositoryException implements Exception {
  const JobsRepositoryException(this.message);

  final String message;
}
