class AuthState {
  const AuthState({
    this.isLoading = false,
    this.errorMessage,
  });

  final bool isLoading;
  final String? errorMessage;

  static const _unset = Object();

  AuthState copyWith({
    bool? isLoading,
    Object? errorMessage = _unset,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: identical(errorMessage, _unset)
          ? this.errorMessage
          : errorMessage as String?,
    );
  }
}
