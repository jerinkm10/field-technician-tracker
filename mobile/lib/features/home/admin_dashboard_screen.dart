import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AdminDashboardScreen extends StatelessWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          'Admin Dashboard',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          'Create jobs, monitor technicians, and review outstanding business actions from one mobile admin workspace.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 20),
        _DashboardShortcut(
          title: 'Live Map',
          subtitle:
              'View technicians, current locations, and the day route map with TODO, IN PROGRESS, and COMPLETED route labels.',
          icon: Icons.map_rounded,
          onTap: () => context.go('/map'),
        ),
        const SizedBox(height: 14),
        _DashboardShortcut(
          title: 'Jobs',
          subtitle:
              'Create jobs and assign multiple technicians or employees from mobile.',
          icon: Icons.assignment_rounded,
          onTap: () => context.go('/jobs'),
        ),
        const SizedBox(height: 14),
        _DashboardShortcut(
          title: 'Outstanding',
          subtitle:
              'Review due amounts, overdue invoices, and open invoice PDFs.',
          icon: Icons.account_balance_wallet_rounded,
          onTap: () => context.go('/outstanding'),
        ),
        const SizedBox(height: 14),
        _DashboardShortcut(
          title: 'AMC',
          subtitle:
              'Track contracts expiring soon, payment dates, and AMC PDFs.',
          icon: Icons.support_agent_rounded,
          onTap: () => context.go('/amc'),
        ),
        const SizedBox(height: 14),
        _DashboardShortcut(
          title: 'Leads',
          subtitle:
              'See assigned leads, today follow-ups, notes, and mobile status updates.',
          icon: Icons.campaign_rounded,
          onTap: () => context.go('/leads'),
        ),
        const SizedBox(height: 14),
        _DashboardShortcut(
          title: 'Ledger',
          subtitle:
              'Search customer, product/service, and HSN or SAC ledger entries with totals.',
          icon: Icons.auto_stories_rounded,
          onTap: () => context.go('/ledger'),
        ),
      ],
    );
  }
}

class _DashboardShortcut extends StatelessWidget {
  const _DashboardShortcut({
    required this.title,
    required this.subtitle,
    required this.icon,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                child: Icon(icon),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              if (onTap != null) const Icon(Icons.arrow_forward_rounded),
            ],
          ),
        ),
      ),
    );
  }
}
