import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../storage/auth_session.dart';

final connectivityProvider = Provider<Connectivity>((ref) {
  return Connectivity();
});

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 20),
      headers: const {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        final authToken = ref.read(authTokenProvider);
        if (authToken != null && authToken.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $authToken';
        }
        handler.next(options);
      },
    ),
  );

  return dio;
});
