import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/auth_session.dart';
import '../../core/storage/local_storage.dart';
import 'auth_repository.dart';
import 'auth_state.dart';

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(
    ref: ref,
    authRepository: ref.watch(authRepositoryProvider),
  );
});

class AuthController extends StateNotifier<AuthState> {
  AuthController({
    required Ref ref,
    required AuthRepository authRepository,
  })  : _ref = ref,
        _authRepository = authRepository,
        super(const AuthState());

  final Ref _ref;
  final AuthRepository _authRepository;

  Future<bool> login({
    required String identifier,
    required String password,
  }) async {
    state = state.copyWith(
      isLoading: true,
      errorMessage: null,
    );

    try {
      final result = await _authRepository.login(
        identifier: identifier.trim(),
        password: password,
      );

      if (!result.user.canUseMobileApp) {
        state = state.copyWith(
          isLoading: false,
          errorMessage:
              'Mobile access is currently available only for admin and technician accounts.',
        );
        return false;
      }

      await AppLocalStorage.saveAuthToken(result.accessToken);
      await AppLocalStorage.saveCurrentUser(result.user);
      _ref.read(authTokenProvider.notifier).state = result.accessToken;
      _ref.read(currentUserProvider.notifier).state = result.user;

      state = state.copyWith(
        isLoading: false,
        errorMessage: null,
      );

      return true;
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: _resolveErrorMessage(error),
      );

      return false;
    }
  }

  void clearError() {
    if (state.errorMessage != null) {
      state = state.copyWith(errorMessage: null);
    }
  }

  String _resolveErrorMessage(Object error) {
    if (error is DioException) {
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout) {
        return 'Unable to reach the server. Check the API URL and internet connection.';
      }

      final responseData = error.response?.data;

      if (responseData is Map) {
        final message = Map<String, dynamic>.from(responseData)['message'];
        if (message is List) {
          return message.join(', ');
        }
        if (message is String && message.isNotEmpty) {
          return message;
        }
      }

      return error.response?.statusMessage ?? 'Login failed';
    }

    if (error is AuthRepositoryException) {
      return error.message;
    }

    return 'Unable to login right now';
  }
}
