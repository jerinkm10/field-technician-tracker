import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/auth_session.dart';
import '../../shared/models/technician_job.dart';
import 'jobs_repository.dart';

final technicianJobsProvider = FutureProvider<List<TechnicianJob>>((ref) async {
  final currentUser = ref.watch(currentUserProvider);
  final repository = ref.watch(jobsRepositoryProvider);

  if (currentUser?.isAdmin == true) {
    return repository.getAdminJobs();
  }

  return repository.getTechnicianJobs();
});

final jobDetailsProvider =
    FutureProvider.family<TechnicianJob, String>((ref, jobId) async {
  return ref.watch(jobsRepositoryProvider).getJobDetails(jobId);
});
