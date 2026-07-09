import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/admin/admin_module_screens.dart';
import '../../features/auth/auth_screen.dart';
import '../../features/home/admin_dashboard_screen.dart';
import '../../features/jobs/job_detail_screen.dart';
import '../../features/jobs/jobs_screen.dart';
import '../../features/map/live_map_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/tracking/tracking_screen.dart';
import '../../shared/models/app_user.dart';
import '../../shared/widgets/app_shell.dart';
import '../storage/auth_session.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authToken = ref.watch(authTokenProvider);
  final currentUser = ref.watch(currentUserProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggingIn = state.matchedLocation == '/login';
      final isAuthenticated =
          authToken != null &&
          authToken.isNotEmpty &&
          currentUser != null &&
          currentUser.canUseMobileApp;
      final defaultLocation = currentUser?.isAdmin == true ? '/admin' : '/map';

      if (!isAuthenticated && !isLoggingIn) {
        return '/login';
      }

      if (isAuthenticated && isLoggingIn) {
        return defaultLocation;
      }

      if (isAuthenticated && currentUser != null) {
        final isAdminLocation = state.matchedLocation == '/admin';
        final isAdminOnlyLocation =
            state.matchedLocation == '/admin' ||
            state.matchedLocation == '/outstanding' ||
            state.matchedLocation == '/amc' ||
            state.matchedLocation == '/leads' ||
            state.matchedLocation == '/ledger' ||
            state.matchedLocation == '/jobs/create';
        final isTechnicianOnlyLocation = state.matchedLocation == '/tracking';

        if (currentUser.isAdmin && isTechnicianOnlyLocation) {
          return '/admin';
        }

        if (currentUser.isTechnician && (isAdminLocation || isAdminOnlyLocation)) {
          return '/map';
        }
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const AuthScreen(),
      ),
      GoRoute(
        path: '/jobs/create',
        builder: (context, state) => const AdminJobFormScreen(),
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
            user: currentUser ?? const AppUser(
              id: '',
              name: '',
              username: '',
              email: '',
              role: '',
            ),
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: '/admin',
            builder: (context, state) => const AdminDashboardScreen(),
          ),
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
            path: '/outstanding',
            builder: (context, state) => const OutstandingsScreen(),
          ),
          GoRoute(
            path: '/amc',
            builder: (context, state) => const AmcScreen(),
          ),
          GoRoute(
            path: '/leads',
            builder: (context, state) => const LeadsScreen(),
          ),
          GoRoute(
            path: '/ledger',
            builder: (context, state) => const LedgerScreen(),
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
