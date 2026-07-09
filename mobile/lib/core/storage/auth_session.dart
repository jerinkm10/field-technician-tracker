import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/models/app_user.dart';
import 'local_storage.dart';

final authTokenProvider = StateProvider<String?>((ref) {
  return AppLocalStorage.getAuthToken();
});

final currentUserProvider = StateProvider<AppUser?>((ref) {
  return AppLocalStorage.getCurrentUser();
});
