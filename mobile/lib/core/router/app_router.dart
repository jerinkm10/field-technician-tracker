import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/auth_screen.dart';
import '../../features/jobs/job_detail_screen.dart';
import '../../features/jobs/jobs_screen.dart';
import '../../features/map/live_map_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/tracking/tracking_screen.dart';
import '../../shared/widgets/app_shell.dart';
import '../storage/auth_session.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authToken = ref.watch(authTokenProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login';
      final isAuthenticated = authToken != null && authToken.isNotEmpty;

      if (!isAuthenticated && !isLoggingIn) {
        return '/login';
      }

      if (isAuthenticated && isLoggingIn) {
        return '/jobs';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const AuthScreen(),
      ),
      GoRoute(
        path: '/jobs/:id',
        builder: (context, state) {
          final jobId = state.pathParameters['id'] ?? '';
          return JobDetailScreen(jobId: jobId);
        },
      ),
      ShellRoute(
        builder: (context, state, child) {
          return AppShell(
            currentLocation: state.matchedLocation,
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: '/jobs',
            builder: (context, state) => const JobListScreen(),
          ),
          GoRoute(
            path: '/tracking',
            builder: (context, state) => const TrackingScreen(),
          ),
          GoRoute(
            path: '/map',
            builder: (context, state) => const LiveMapScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});
