import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
import '../../core/storage/auth_session.dart';
import 'auth_controller.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _identifierController;
  late final TextEditingController _passwordController;

  bool _obscurePassword = true;
  bool _rememberMe = true;

  @override
  void initState() {
    super.initState();
    _identifierController = TextEditingController();
    _passwordController = TextEditingController();
  }

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final formState = _formKey.currentState;
    if (formState == null || !formState.validate()) {
      return;
    }

    final didLogin = await ref.read(authControllerProvider.notifier).login(
          identifier: _identifierController.text,
          password: _passwordController.text,
        );

    if (didLogin && mounted) {
      final currentUser = ref.read(currentUserProvider);
      context.go(currentUser?.isAdmin == true ? '/admin' : '/map');
    }
  }

  void _showInfoMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  InputDecoration _buildFieldDecoration({
    required String hintText,
    required IconData icon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: const TextStyle(
        color: Color(0xFF7B8DAF),
        fontSize: 17,
        fontWeight: FontWeight.w500,
      ),
      filled: true,
      fillColor: Colors.white.withValues(alpha: 0.92),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 20,
        vertical: 20,
      ),
      prefixIcon: Icon(
        icon,
        color: const Color(0xFF5B7BA9),
      ),
      suffixIcon: suffixIcon,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(
          color: Color(0xFFD5E1F2),
          width: 1.2,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(
          color: Color(0xFF1C6CCF),
          width: 1.8,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(
          color: Color(0xFFD9534F),
          width: 1.2,
        ),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(
          color: Color(0xFFD9534F),
          width: 1.8,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);
    final screenSize = MediaQuery.sizeOf(context);
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    final isCompact = screenSize.height < 820;
    final brandWidth = screenSize.width.clamp(240.0, 360.0).toDouble();

    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          color: Color(0xFFBFD8F0),
        ),
        child: Stack(
          children: [
            const Positioned.fill(
              child: _AuthBackgroundScene(),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.white.withValues(alpha: 0.18),
                      Colors.white.withValues(alpha: 0.05),
                      const Color(0xFF18497F).withValues(alpha: 0.28),
                    ],
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.fromLTRB(
                    18,
                    isCompact ? 18 : 30,
                    18,
                    keyboardInset + 22,
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 460),
                    child: Column(
                      children: [
                        Image.asset(
                          'assets/branding/hc_logo.png',
                          width: brandWidth,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: 22),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(38),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                            child: Container(
                              padding:
                                  const EdgeInsets.fromLTRB(18, 22, 18, 20),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.78),
                                borderRadius: BorderRadius.circular(38),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.8),
                                  width: 1.2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF0E4F9A)
                                        .withValues(alpha: 0.14),
                                    blurRadius: 40,
                                    offset: const Offset(0, 20),
                                  ),
                                ],
                              ),
                              child: Form(
                                key: _formKey,
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    Align(
                                      child: Container(
                                        height: 74,
                                        width: 74,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: const Color(0xFFF4FAFF),
                                          border: Border.all(
                                            color: const Color(0xFFD4E5FB),
                                            width: 1.5,
                                          ),
                                        ),
                                        child: const Icon(
                                          Icons.lock_rounded,
                                          size: 34,
                                          color: Color(0xFF256FD1),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 18),
                                    const Text(
                                      'Welcome Back',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: Color(0xFF16326E),
                                        fontSize: 25,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Sign in to continue with ${AppConfig.appName}.',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: Color(0xFF4E6790),
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    if (authState.errorMessage != null) ...[
                                      const SizedBox(height: 16),
                                      Container(
                                        padding: const EdgeInsets.all(14),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFDECEC),
                                          borderRadius:
                                              BorderRadius.circular(18),
                                          border: Border.all(
                                            color: const Color(0xFFF4B6B2),
                                          ),
                                        ),
                                        child: Text(
                                          authState.errorMessage!,
                                          textAlign: TextAlign.center,
                                          style: const TextStyle(
                                            color: Color(0xFF9E2421),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                    const SizedBox(height: 20),
                                    TextFormField(
                                      controller: _identifierController,
                                      textInputAction: TextInputAction.next,
                                      keyboardType: TextInputType.emailAddress,
                                      onChanged: (_) {
                                        ref
                                            .read(
                                                authControllerProvider.notifier)
                                            .clearError();
                                      },
                                      validator: (value) {
                                        final identifier = value?.trim() ?? '';
                                        if (identifier.isEmpty) {
                                          return 'User ID or email is required';
                                        }
                                        return null;
                                      },
                                      decoration: _buildFieldDecoration(
                                        hintText: 'User ID or Email',
                                        icon: Icons.person_outline_rounded,
                                      ),
                                    ),
                                    const SizedBox(height: 14),
                                    TextFormField(
                                      controller: _passwordController,
                                      obscureText: _obscurePassword,
                                      textInputAction: TextInputAction.done,
                                      onChanged: (_) {
                                        ref
                                            .read(
                                                authControllerProvider.notifier)
                                            .clearError();
                                      },
                                      onFieldSubmitted: (_) {
                                        if (!authState.isLoading) {
                                          _handleLogin();
                                        }
                                      },
                                      validator: (value) {
                                        if ((value ?? '').trim().isEmpty) {
                                          return 'Password is required';
                                        }
                                        return null;
                                      },
                                      decoration: _buildFieldDecoration(
                                        hintText: 'Password',
                                        icon: Icons.lock_outline_rounded,
                                        suffixIcon: IconButton(
                                          onPressed: () {
                                            setState(() {
                                              _obscurePassword =
                                                  !_obscurePassword;
                                            });
                                          },
                                          icon: Icon(
                                            _obscurePassword
                                                ? Icons.visibility_outlined
                                                : Icons.visibility_off_outlined,
                                            color: const Color(0xFF7B8DAF),
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Transform.scale(
                                          scale: 1.05,
                                          child: Checkbox(
                                            value: _rememberMe,
                                            onChanged: (value) {
                                              setState(() {
                                                _rememberMe = value ?? false;
                                              });
                                            },
                                            fillColor:
                                                WidgetStateProperty.resolveWith(
                                              (states) {
                                                if (states.contains(
                                                  WidgetState.selected,
                                                )) {
                                                  return const Color(
                                                      0xFF2C75D0);
                                                }
                                                return Colors.white;
                                              },
                                            ),
                                            side: const BorderSide(
                                              color: Color(0xFF8EA9CF),
                                              width: 1.4,
                                            ),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(6),
                                            ),
                                          ),
                                        ),
                                        const Text(
                                          'Remember me',
                                          style: TextStyle(
                                            color: Color(0xFF486387),
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        const Spacer(),
                                        TextButton(
                                          onPressed: () {
                                            _showInfoMessage(
                                              'Please contact HC admin to reset your password.',
                                            );
                                          },
                                          style: TextButton.styleFrom(
                                            foregroundColor:
                                                const Color(0xFF216DCD),
                                          ),
                                          child: const Text('Forgot Password?'),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    SizedBox(
                                      height: 58,
                                      child: FilledButton(
                                        onPressed: authState.isLoading
                                            ? null
                                            : _handleLogin,
                                        style: FilledButton.styleFrom(
                                          backgroundColor:
                                              const Color(0xFF1D64BF),
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(18),
                                          ),
                                        ),
                                        child: authState.isLoading
                                            ? const SizedBox(
                                                height: 22,
                                                width: 22,
                                                child:
                                                    CircularProgressIndicator(
                                                  strokeWidth: 2.2,
                                                  valueColor:
                                                      AlwaysStoppedAnimation(
                                                    Colors.white,
                                                  ),
                                                ),
                                              )
                                            : const Row(
                                                children: [
                                                  Spacer(),
                                                  Text(
                                                    'Sign In',
                                                    style: TextStyle(
                                                      fontSize: 18,
                                                      fontWeight:
                                                          FontWeight.w800,
                                                    ),
                                                  ),
                                                  Spacer(),
                                                  Icon(
                                                    Icons.arrow_forward_rounded,
                                                    size: 28,
                                                  ),
                                                ],
                                              ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.verified_user_outlined,
                              size: 18,
                              color: Colors.white,
                            ),
                            SizedBox(width: 8),
                            Text(
                              'Secure. Reliable. Always.',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.1,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AuthBackgroundScene extends StatelessWidget {
  const _AuthBackgroundScene();

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/branding/hc_login_background.png',
      fit: BoxFit.cover,
      alignment: Alignment.topCenter,
    );
  }
}
