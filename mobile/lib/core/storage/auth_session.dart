import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'local_storage.dart';

final authTokenProvider = StateProvider<String?>((ref) {
  return AppLocalStorage.getAuthToken();
});
