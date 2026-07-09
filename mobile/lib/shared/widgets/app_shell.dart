import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../models/app_user.dart';

class AppShell extends StatelessWidget {
  const AppShell({
    super.key,
    required this.currentLocation,
    required this.user,
    required this.child,
  });

  final String currentLocation;
  final AppUser user;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final destinations = user.isAdmin
        ? const [
            _ShellDestination(
              route: '/admin',
              icon: Icons.dashboard_outlined,
              selectedIcon: Icons.dashboard_rounded,
              label: 'Dashboard',
            ),
            _ShellDestination(
              route: '/map',
              icon: Icons.map_outlined,
              selectedIcon: Icons.map_rounded,
              label: 'Live Map',
            ),
            _ShellDestination(
              route: '/jobs',
              icon: Icons.assignment_outlined,
              selectedIcon: Icons.assignment_rounded,
              label: 'Jobs',
            ),
            _ShellDestination(
              route: '/profile',
              icon: Icons.person_outline_rounded,
              selectedIcon: Icons.person_rounded,
              label: 'Profile',
            ),
          ]
        : const [
            _ShellDestination(
              route: '/map',
              icon: Icons.map_outlined,
              selectedIcon: Icons.map_rounded,
              label: 'Route',
            ),
            _ShellDestination(
              route: '/jobs',
              icon: Icons.assignment_outlined,
              selectedIcon: Icons.assignment_rounded,
              label: 'Jobs',
            ),
            _ShellDestination(
              route: '/tracking',
              icon: Icons.how_to_reg_outlined,
              selectedIcon: Icons.how_to_reg_rounded,
              label: 'Attendance',
            ),
            _ShellDestination(
              route: '/profile',
              icon: Icons.person_outline_rounded,
              selectedIcon: Icons.person_rounded,
              label: 'Profile',
            ),
          ];
    final selectedIndex = _locationToIndex(currentLocation, destinations);

    return Scaffold(
      body: SafeArea(child: child),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) {
          if (index != selectedIndex) {
            context.go(destinations[index].route);
          }
        },
        destinations: destinations
            .map(
              (destination) => NavigationDestination(
                icon: Icon(destination.icon),
                selectedIcon: Icon(destination.selectedIcon),
                label: destination.label,
              ),
            )
            .toList(),
      ),
    );
  }

  int _locationToIndex(
    String location,
    List<_ShellDestination> destinations,
  ) {
    if (
        user.isAdmin &&
        (location == '/outstanding' ||
            location == '/amc' ||
            location == '/leads' ||
            location == '/ledger')) {
      return 0;
    }

    for (var index = 0; index < destinations.length; index++) {
      final destination = destinations[index];
      if (location == destination.route || location.startsWith('${destination.route}/')) {
        return index;
      }
    }

    return 0;
  }
}

class _ShellDestination {
  const _ShellDestination({
    required this.route,
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });

  final String route;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
}
