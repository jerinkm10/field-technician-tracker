import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../shared/models/app_user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider));
});

class AuthRepository {
  AuthRepository(this._dio);

  final Dio _dio;

  Future<LoginResult> login({
    required String identifier,
    required String password,
  }) async {
    final normalizedIdentifier = identifier.trim();
    final isEmail = normalizedIdentifier.contains('@');

    final response = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {
        if (isEmail) 'email': normalizedIdentifier,
        if (!isEmail) 'username': normalizedIdentifier,
        'password': password,
      },
    );

    final data = response.data;
    if (data == null) {
      throw const AuthRepositoryException('Empty login response');
    }

    final accessToken = data['accessToken'] as String?;
    final userJson = data['user'];

    if (accessToken == null || userJson is! Map) {
      throw const AuthRepositoryException('Invalid login response');
    }

    return LoginResult(
      accessToken: accessToken,
      user: AppUser.fromJson(Map<String, dynamic>.from(userJson)),
    );
  }
}

class LoginResult {
  const LoginResult({
    required this.accessToken,
    required this.user,
  });

  final String accessToken;
  final AppUser user;
}

class AuthRepositoryException implements Exception {
  const AuthRepositoryException(this.message);

  final String message;
}
