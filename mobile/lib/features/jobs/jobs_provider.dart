import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/technician_job.dart';
import 'jobs_repository.dart';

final technicianJobsProvider = FutureProvider<List<TechnicianJob>>((ref) async {
  return ref.watch(jobsRepositoryProvider).getTechnicianJobs();
});

final jobDetailsProvider =
    FutureProvider.family<TechnicianJob, String>((ref, jobId) async {
  return ref.watch(jobsRepositoryProvider).getJobDetails(jobId);
});
