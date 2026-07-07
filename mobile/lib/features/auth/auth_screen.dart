import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/config/app_config.dart';
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
      context.go('/jobs');
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
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF67A7E4),
              Color(0xFFF6FBFF),
              Color(0xFFE3EFFC),
              Color(0xFF6C97D0),
            ],
            stops: [0, 0.38, 0.72, 1],
          ),
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
                      Colors.white.withValues(alpha: 0.16),
                      Colors.white.withValues(alpha: 0.05),
                      const Color(0xFF4D7FB9).withValues(alpha: 0.16),
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
                                    const SizedBox(height: 18),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Container(
                                            height: 1,
                                            color: const Color(0xFFD3DFF0),
                                          ),
                                        ),
                                        const Padding(
                                          padding: EdgeInsets.symmetric(
                                            horizontal: 14,
                                          ),
                                          child: Text(
                                            'or',
                                            style: TextStyle(
                                              color: Color(0xFF7D90B0),
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                        Expanded(
                                          child: Container(
                                            height: 1,
                                            color: const Color(0xFFD3DFF0),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 18),
                                    SizedBox(
                                      height: 56,
                                      child: OutlinedButton.icon(
                                        onPressed: () {
                                          _showInfoMessage(
                                            'SSO sign in can be connected later.',
                                          );
                                        },
                                        style: OutlinedButton.styleFrom(
                                          side: const BorderSide(
                                            color: Color(0xFF2A77D4),
                                            width: 1.4,
                                          ),
                                          foregroundColor:
                                              const Color(0xFF1F67C4),
                                          backgroundColor: Colors.white
                                              .withValues(alpha: 0.75),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(18),
                                          ),
                                        ),
                                        icon: const Icon(
                                          Icons.shield_outlined,
                                        ),
                                        label: const Text(
                                          'Sign in with SSO',
                                          style: TextStyle(
                                            fontSize: 17,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 22),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 8,
                                      ),
                                      decoration: const BoxDecoration(
                                        border: Border(
                                          top: BorderSide(
                                            color: Color(0xFFDBE5F4),
                                          ),
                                        ),
                                      ),
                                      child: const _FeatureGrid(),
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
    return Stack(
      children: [
        Positioned(
          top: -80,
          left: -40,
          child: _CloudDecoration(
            width: 240,
            height: 108,
            opacity: 0.34,
          ),
        ),
        Positioned(
          top: 86,
          right: 30,
          child: _CloudDecoration(
            width: 180,
            height: 80,
            opacity: 0.24,
          ),
        ),
        Positioned(
          top: 24,
          right: -80,
          child: Container(
            height: 260,
            width: 260,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  Colors.white.withValues(alpha: 0.78),
                  Colors.white.withValues(alpha: 0.06),
                ],
              ),
            ),
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            height: 260,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.white.withValues(alpha: 0),
                  Colors.white.withValues(alpha: 0.14),
                  const Color(0xFF4C78A8).withValues(alpha: 0.38),
                ],
              ),
            ),
          ),
        ),
        const Positioned(
          left: -12,
          bottom: 200,
          child: _CoolingUnitDecoration(),
        ),
        const Positioned(
          right: -16,
          bottom: 256,
          child: _PipeDeckDecoration(),
        ),
        const Positioned(
          left: 240,
          right: 18,
          bottom: 258,
          child: _CitySkylineDecoration(),
        ),
      ],
    );
  }
}

class _CoolingUnitDecoration extends StatelessWidget {
  const _CoolingUnitDecoration();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 230,
      height: 355,
      padding: const EdgeInsets.fromLTRB(12, 18, 12, 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFFF9FBFF),
            Color(0xFFDCE8F5),
            Color(0xFFBBCFE5),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF143D78).withValues(alpha: 0.18),
            blurRadius: 26,
            offset: const Offset(0, 16),
          ),
        ],
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.8),
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Row(
            children: List.generate(
              2,
              (index) => Expanded(
                child: Container(
                  height: 20,
                  margin: EdgeInsets.only(right: index == 0 ? 10 : 0),
                  decoration: BoxDecoration(
                    color: const Color(0xFF90959E),
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Expanded(
            child: Row(
              children: List.generate(
                2,
                (column) => Expanded(
                  child: Container(
                    margin: EdgeInsets.only(right: column == 0 ? 10 : 0),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF123D74).withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: List.generate(
                        12,
                        (index) => Expanded(
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.transparent,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(
                                color: const Color(0xFF274C7D)
                                    .withValues(alpha: 0.42),
                                width: 0.6,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            height: 42,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF4C6284),
                  Color(0xFF344C73),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _PipeDeckDecoration extends StatelessWidget {
  const _PipeDeckDecoration();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 230,
      height: 220,
      child: Stack(
        children: [
          Positioned(
            right: 24,
            bottom: 26,
            child: Container(
              width: 128,
              height: 56,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFFD6E2F0),
                    Color(0xFFA9BED7),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          Positioned(
            right: 96,
            bottom: 36,
            child: Container(
              width: 120,
              height: 18,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.74),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: const Color(0xFFA7C3E4),
                  width: 1.6,
                ),
              ),
            ),
          ),
          Positioned(
            right: 18,
            bottom: 86,
            child: Container(
              width: 164,
              height: 20,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.74),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(
                  color: const Color(0xFFA7C3E4),
                  width: 1.6,
                ),
              ),
            ),
          ),
          Positioned(
            right: 36,
            bottom: 0,
            child: Container(
              width: 54,
              height: 120,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFFD6E2F0),
                    Color(0xFFA0B5CE),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CitySkylineDecoration extends StatelessWidget {
  const _CitySkylineDecoration();

  @override
  Widget build(BuildContext context) {
    const heights = [44.0, 66.0, 52.0, 92.0, 70.0, 110.0];

    return SizedBox(
      height: 150,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(
          heights.length,
          (index) => Expanded(
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                height: heights[index],
                margin: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.white.withValues(alpha: 0.52),
                      Colors.white.withValues(alpha: 0.12),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CloudDecoration extends StatelessWidget {
  const _CloudDecoration({
    required this.width,
    required this.height,
    required this.opacity,
  });

  final double width;
  final double height;
  final double opacity;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: opacity,
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(height),
          gradient: const LinearGradient(
            colors: [
              Colors.white,
              Color(0xFFE9F4FF),
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.white.withValues(alpha: 0.28),
              blurRadius: 24,
              spreadRadius: 6,
            ),
          ],
        ),
      ),
    );
  }
}

class _FeatureGrid extends StatelessWidget {
  const _FeatureGrid();

  static const _items = [
    _FeatureItemData(
      icon: Icons.ac_unit_rounded,
      label: 'Cooling\nOperations',
    ),
    _FeatureItemData(
      icon: Icons.receipt_long_outlined,
      label: 'Billing &\nContracts',
    ),
    _FeatureItemData(
      icon: Icons.groups_2_outlined,
      label: 'Field\nTeams',
    ),
    _FeatureItemData(
      icon: Icons.verified_user_outlined,
      label: 'Trusted\nSolutions',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final useFourColumns = constraints.maxWidth >= 360;
        final tileWidth = useFourColumns
            ? constraints.maxWidth / 4
            : (constraints.maxWidth - 12) / 2;

        return Wrap(
          spacing: 0,
          runSpacing: 12,
          children: _items
              .map(
                (item) => SizedBox(
                  width: tileWidth,
                  child: _FeatureTile(item: item),
                ),
              )
              .toList(),
        );
      },
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    required this.item,
  });

  final _FeatureItemData item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        border: Border(
          left: BorderSide(
            color: const Color(0xFFD7E2F1).withValues(alpha: 0.8),
            width: 1,
          ),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            item.icon,
            size: 34,
            color: const Color(0xFF2068C9),
          ),
          const SizedBox(height: 10),
          Text(
            item.label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF183970),
              fontSize: 13,
              fontWeight: FontWeight.w700,
              height: 1.22,
            ),
          ),
        ],
      ),
    );
  }
}

class _FeatureItemData {
  const _FeatureItemData({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;
}
