import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../core/storage/auth_session.dart';
import '../../core/storage/local_storage.dart';
import '../../shared/models/mobile_portal_models.dart';
import '../../shared/repositories/mobile_portal_repository.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  NotificationListResult? _notifications;
  bool _loadingNotifications = true;
  bool _markingAll = false;
  String? _notificationError;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _loadingNotifications = true;
      _notificationError = null;
    });

    try {
      final notifications = await ref.read(mobilePortalRepositoryProvider).getNotifications(
            limit: 20,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _notifications = notifications;
        _loadingNotifications = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loadingNotifications = false;
        _notificationError = error.toString();
      });
    }
  }

  Future<void> _markNotificationRead(MobileNotification notification) async {
    if (notification.isRead) {
      return;
    }

    try {
      await ref
          .read(mobilePortalRepositoryProvider)
          .markNotificationRead(notification.id);

      if (!mounted) {
        return;
      }

      final current = _notifications;
      if (current == null) {
        return;
      }

      setState(() {
        _notifications = NotificationListResult(
          unreadCount: current.unreadCount > 0 ? current.unreadCount - 1 : 0,
          items: current.items
              .map(
                (item) => item.id == notification.id
                    ? MobileNotification(
                        id: item.id,
                        title: item.title,
                        message: item.message,
                        referenceType: item.referenceType,
                        referenceId: item.referenceId,
                        isRead: true,
                        createdAt: item.createdAt,
                      )
                    : item,
              )
              .toList(),
        );
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to mark notification read: $error')),
      );
    }
  }

  Future<void> _markAllRead() async {
    setState(() {
      _markingAll = true;
    });

    try {
      await ref.read(mobilePortalRepositoryProvider).markAllNotificationsRead();

      if (!mounted) {
        return;
      }

      final current = _notifications;
      if (current != null) {
        setState(() {
          _notifications = NotificationListResult(
            unreadCount: 0,
            items: current.items
                .map(
                  (item) => MobileNotification(
                    id: item.id,
                    title: item.title,
                    message: item.message,
                    referenceType: item.referenceType,
                    referenceId: item.referenceId,
                    isRead: true,
                    createdAt: item.createdAt,
                  ),
                )
                .toList(),
          );
        });
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to mark all notifications read: $error')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _markingAll = false;
        });
      }
    }
  }

  String _formatDateTime(DateTime? value) {
    if (value == null) {
      return '--';
    }

    return DateFormat('dd MMM, hh:mm a').format(value.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    if (user == null) {
      return const SizedBox.shrink();
    }

    return RefreshIndicator(
      onRefresh: _loadNotifications,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
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
                  Text(user.email.isEmpty ? user.username : user.email),
                  const SizedBox(height: 8),
                  Chip(label: Text(user.role)),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () async {
                        await AppLocalStorage.clearSession();
                        ref.read(authTokenProvider.notifier).state = null;
                        ref.read(currentUserProvider.notifier).state = null;
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
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: Text(
                  _notifications == null
                      ? 'Notifications'
                      : 'Notifications (${_notifications!.unreadCount} unread)',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
              TextButton(
                onPressed: _markingAll ? null : _markAllRead,
                child: Text(_markingAll ? 'Working...' : 'Mark All Read'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_loadingNotifications)
            const Padding(
              padding: EdgeInsets.only(top: 40),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_notificationError != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  children: [
                    Text(
                      _notificationError!,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _loadNotifications,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          else if ((_notifications?.items ?? const <MobileNotification>[]).isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Text('No notifications available right now.'),
              ),
            )
          else
            ..._notifications!.items.map(
              (notification) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  color: notification.isRead
                      ? Colors.white
                      : const Color(0xFFEFF6FF),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => _markNotificationRead(notification),
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  notification.title,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleSmall
                                      ?.copyWith(fontWeight: FontWeight.w800),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: notification.isRead
                                      ? const Color(0xFFF1F5F9)
                                      : const Color(0xFFDBEAFE),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  notification.isRead ? 'Read' : 'Unread',
                                  style: TextStyle(
                                    color: notification.isRead
                                        ? const Color(0xFF5F6C7B)
                                        : const Color(0xFF1D4ED8),
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(notification.message),
                          const SizedBox(height: 10),
                          Text(
                            '${notification.referenceType} | ${_formatDateTime(notification.createdAt)}',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: const Color(0xFF5F6C7B),
                                ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
