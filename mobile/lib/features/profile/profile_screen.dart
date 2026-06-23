import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/storage/auth_session.dart';
import '../../core/storage/local_storage.dart';
import '../../shared/models/app_user.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    const user = AppUser(
      id: 'tech-1',
      name: 'Rahul Verma',
      email: 'tech@example.com',
      role: 'TECHNICIAN',
    );

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Profile',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 30,
                  child: Icon(Icons.person_outline_rounded),
                ),
                const SizedBox(height: 16),
                Text(
                  user.name,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(user.email),
                const SizedBox(height: 8),
                Chip(label: Text(user.role)),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () async {
                      await AppLocalStorage.clearAuthToken();
                      ref.read(authTokenProvider.notifier).state = null;
                      if (context.mounted) {
                        context.go('/login');
                      }
                    },
                    child: const Text('Logout'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
