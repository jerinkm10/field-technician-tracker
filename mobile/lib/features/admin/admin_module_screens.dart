import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_config.dart';
import '../../core/storage/auth_session.dart';
import '../../shared/models/mobile_portal_models.dart';
import '../../shared/repositories/mobile_portal_repository.dart';
import '../jobs/jobs_provider.dart';
import '../jobs/jobs_repository.dart';

final _currencyFormatter = NumberFormat.currency(
  locale: 'en_IN',
  symbol: 'INR ',
  decimalDigits: 2,
);

String _formatDate(DateTime? value, {bool withTime = false}) {
  if (value == null) {
    return '--';
  }

  return DateFormat(withTime ? 'dd MMM yyyy, hh:mm a' : 'dd MMM yyyy')
      .format(value.toLocal());
}

String _formatStatus(String value) {
  if (value.isEmpty) {
    return '--';
  }

  return value
      .split('_')
      .map(
        (part) =>
            '${part.substring(0, 1).toUpperCase()}${part.substring(1).toLowerCase()}',
      )
      .join(' ');
}

Color _statusColor(String status) {
  switch (status) {
    case 'COMPLETED':
    case 'PAID':
    case 'CONVERTED':
    case 'ACTIVE':
    case 'AVAILABLE':
      return const Color(0xFF1F8F5F);
    case 'STARTED':
    case 'IN_PROGRESS':
    case 'ON_JOB':
      return const Color(0xFF1C6DD0);
    case 'OVERDUE':
    case 'HIGH':
    case 'EXPIRED':
    case 'LOST':
      return const Color(0xFFC13D53);
    case 'ASSIGNED':
    case 'PENDING':
    case 'PARTIAL':
    case 'FOLLOW_UP':
      return const Color(0xFFC77A1F);
    default:
      return const Color(0xFF5A6C7D);
  }
}

Future<void> _launchSecurePdf(
  BuildContext context,
  WidgetRef ref,
  String path,
) async {
  final token = ref.read(authTokenProvider);
  if (token == null || token.isEmpty) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your login session is missing.')),
      );
    }
    return;
  }

  final uri = Uri.parse('${AppConfig.apiBaseUrl}$path')
      .replace(queryParameters: {'accessToken': token});
  final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);

  if (!launched && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Unable to open the PDF on this device.')),
    );
  }
}

String _readableError(Object error, [String fallback = 'Something went wrong.']) {
  if (error is DioException) {
    final payload = error.response?.data;
    if (payload is Map && payload['message'] is String) {
      return payload['message'] as String;
    }

    if (payload is Map && payload['message'] is List) {
      final messages = (payload['message'] as List)
          .map((item) => item.toString())
          .where((item) => item.trim().isNotEmpty)
          .toList();
      if (messages.isNotEmpty) {
        return messages.join(', ');
      }
    }

    if (error.message != null && error.message!.trim().isNotEmpty) {
      return error.message!;
    }
  }

  return fallback;
}

class AdminJobFormScreen extends ConsumerStatefulWidget {
  const AdminJobFormScreen({super.key});

  @override
  ConsumerState<AdminJobFormScreen> createState() => _AdminJobFormScreenState();
}

class _AdminJobFormScreenState extends ConsumerState<AdminJobFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _jobNumberController = TextEditingController();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  List<CustomerLookup> _customers = const [];
  List<EmployeeLookup> _members = const [];
  List<BranchLookup> _branches = const [];
  bool _loading = true;
  bool _saving = false;
  String? _loadError;
  String? _customerId;
  String? _branchId;
  String _priority = 'MEDIUM';
  String _scheduledDate = DateFormat('yyyy-MM-dd').format(DateTime.now());
  final Set<String> _assignedMemberIds = <String>{};

  @override
  void initState() {
    super.initState();
    _jobNumberController.text =
        'JOB-${DateFormat('yyyyMMdd-HHmmss').format(DateTime.now())}';
    _loadLookups();
  }

  @override
  void dispose() {
    _jobNumberController.dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadLookups() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });

    try {
      final repository = ref.read(mobilePortalRepositoryProvider);
      final results = await Future.wait([
        repository.getCustomers(),
        repository.getEmployees(),
        repository.getBranches(),
      ]);

      if (!mounted) {
        return;
      }

      final members = (results[1] as List<EmployeeLookup>)
          .where((member) =>
              member.role == 'TECHNICIAN' || member.role == 'EMPLOYEE')
          .toList()
        ..sort((left, right) => left.name.compareTo(right.name));

      setState(() {
        _customers = (results[0] as List<CustomerLookup>)
          ..sort((left, right) => left.name.compareTo(right.name));
        _members = members;
        _branches = (results[2] as List<BranchLookup>)
          ..sort((left, right) => left.name.compareTo(right.name));
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _loadError = _readableError(
          error,
          'Unable to load customers, members, or branches.',
        );
      });
    }
  }

  Future<void> _pickScheduledDate() async {
    final initialDate = DateTime.tryParse(_scheduledDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );

    if (picked != null) {
      setState(() {
        _scheduledDate = DateFormat('yyyy-MM-dd').format(picked);
      });
    }
  }

  Future<void> _selectMembers() async {
    final currentSelection = Set<String>.from(_assignedMemberIds);

    final selected = await showModalBottomSheet<Set<String>>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        final temporarySelection = Set<String>.from(currentSelection);

        return StatefulBuilder(
          builder: (context, setModalState) {
            return SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Assigned Members',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Choose one or more technicians or employees for this job.',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 16),
                    Flexible(
                      child: ListView(
                        shrinkWrap: true,
                        children: _members.map((member) {
                          final selected = temporarySelection.contains(member.id);

                          return CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            value: selected,
                            title: Text(member.name),
                            subtitle: Text('${member.role} | ${member.username}'),
                            onChanged: (value) {
                              setModalState(() {
                                if (value == true) {
                                  temporarySelection.add(member.id);
                                } else {
                                  temporarySelection.remove(member.id);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Cancel'),
                        ),
                        const Spacer(),
                        FilledButton(
                          onPressed: () => Navigator.of(context).pop(
                            Set<String>.from(temporarySelection),
                          ),
                          child: const Text('Apply'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    if (selected != null) {
      setState(() {
        _assignedMemberIds
          ..clear()
          ..addAll(selected);
      });
    }
  }

  Future<void> _save() async {
    final formState = _formKey.currentState;
    if (formState == null || !formState.validate()) {
      return;
    }

    setState(() {
      _saving = true;
    });

    try {
      await ref.read(jobsRepositoryProvider).createAdminJob(
            jobNumber: _jobNumberController.text,
            title: _titleController.text,
            description: _descriptionController.text,
            customerId: _customerId!,
            branchId: _branchId,
            assignedMemberIds: _assignedMemberIds.toList(),
            priority: _priority,
            scheduledDate: _scheduledDate,
          );
      ref.invalidate(technicianJobsProvider);

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Job created successfully.')),
      );
      context.pop();
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_readableError(error, 'Unable to create job.'))),
      );
      setState(() {
        _saving = false;
      });
      return;
    }

    if (mounted) {
      setState(() {
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedMembers = _members
        .where((member) => _assignedMemberIds.contains(member.id))
        .toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Job'),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
              ? _ErrorState(message: _loadError!, onRetry: _loadLookups)
              : Form(
                  key: _formKey,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    children: [
                      _SectionHeader(
                        eyebrow: 'Admin Mobile',
                        title: 'Create and assign a new field job',
                        subtitle:
                            'Dispatch work to multiple technicians or employees directly from mobile.',
                      ),
                      const SizedBox(height: 20),
                      _SurfaceCard(
                        child: Column(
                          children: [
                            TextFormField(
                              controller: _jobNumberController,
                              decoration: const InputDecoration(
                                labelText: 'Job Number',
                              ),
                              validator: (value) {
                                if ((value ?? '').trim().isEmpty) {
                                  return 'Job number is required';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _titleController,
                              decoration: const InputDecoration(
                                labelText: 'Job Title',
                              ),
                              validator: (value) {
                                if ((value ?? '').trim().isEmpty) {
                                  return 'Title is required';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                            DropdownButtonFormField<String>(
                              value: _customerId,
                              decoration: const InputDecoration(
                                labelText: 'Customer',
                              ),
                              items: _customers
                                  .map(
                                    (customer) => DropdownMenuItem(
                                      value: customer.id,
                                      child: Text(customer.name),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (value) {
                                setState(() {
                                  _customerId = value;
                                });
                              },
                              validator: (value) {
                                if (value == null || value.isEmpty) {
                                  return 'Customer is required';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 14),
                            DropdownButtonFormField<String?>(
                              value: _branchId,
                              decoration: const InputDecoration(
                                labelText: 'Branch',
                              ),
                              items: [
                                const DropdownMenuItem<String?>(
                                  value: null,
                                  child: Text('No branch'),
                                ),
                                ..._branches.map(
                                  (branch) => DropdownMenuItem(
                                    value: branch.id,
                                    child: Text(branch.name),
                                  ),
                                ),
                              ],
                              onChanged: (value) {
                                setState(() {
                                  _branchId = value;
                                });
                              },
                            ),
                            const SizedBox(height: 14),
                            DropdownButtonFormField<String>(
                              value: _priority,
                              decoration: const InputDecoration(
                                labelText: 'Priority',
                              ),
                              items: const [
                                DropdownMenuItem(
                                  value: 'LOW',
                                  child: Text('Low'),
                                ),
                                DropdownMenuItem(
                                  value: 'MEDIUM',
                                  child: Text('Medium'),
                                ),
                                DropdownMenuItem(
                                  value: 'HIGH',
                                  child: Text('High'),
                                ),
                              ],
                              onChanged: (value) {
                                if (value == null) {
                                  return;
                                }

                                setState(() {
                                  _priority = value;
                                });
                              },
                            ),
                            const SizedBox(height: 14),
                            InkWell(
                              borderRadius: BorderRadius.circular(18),
                              onTap: _pickScheduledDate,
                              child: InputDecorator(
                                decoration: const InputDecoration(
                                  labelText: 'Scheduled Date',
                                ),
                                child: Row(
                                  children: [
                                    Text(_scheduledDate),
                                    const Spacer(),
                                    const Icon(Icons.calendar_today_outlined),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _descriptionController,
                              minLines: 4,
                              maxLines: 6,
                              decoration: const InputDecoration(
                                labelText: 'Description',
                                alignLabelWithHint: true,
                              ),
                              validator: (value) {
                                if ((value ?? '').trim().isEmpty) {
                                  return 'Description is required';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                'Assigned Members',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: selectedMembers.isEmpty
                                  ? const [
                                      _HintChip(label: 'No members selected'),
                                    ]
                                  : selectedMembers
                                      .map(
                                        (member) => _HintChip(
                                          label: '${member.name} (${member.role})',
                                        ),
                                      )
                                      .toList(),
                            ),
                            const SizedBox(height: 12),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: _selectMembers,
                                icon: const Icon(Icons.groups_outlined),
                                label: const Text('Choose Members'),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      FilledButton.icon(
                        onPressed: _saving ? null : _save,
                        icon: _saving
                            ? const SizedBox(
                                height: 18,
                                width: 18,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.check_circle_outline),
                        label: Text(_saving ? 'Saving...' : 'Create Job'),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class OutstandingsScreen extends ConsumerStatefulWidget {
  const OutstandingsScreen({super.key});

  @override
  ConsumerState<OutstandingsScreen> createState() => _OutstandingsScreenState();
}

class _OutstandingsScreenState extends ConsumerState<OutstandingsScreen> {
  final _searchController = TextEditingController();
  List<OutstandingItem> _items = const [];
  bool _loading = true;
  String _status = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await ref.read(mobilePortalRepositoryProvider).getOutstandings(
            search: _searchController.text.trim(),
            status: _status,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = _readableError(error, 'Unable to load outstanding records.');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final overdueCount = _items.where((item) {
      final dueDate = item.dueDate;
      return dueDate != null &&
          dueDate.isBefore(DateTime(today.year, today.month, today.day)) &&
          item.status != 'PAID';
    }).length;
    final dueTodayCount = _items.where((item) {
      final dueDate = item.dueDate;
      return dueDate != null &&
          dueDate.year == today.year &&
          dueDate.month == today.month &&
          dueDate.day == today.day &&
          item.status != 'PAID';
    }).length;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          const _SectionHeader(
            eyebrow: 'Admin Only',
            title: 'Outstanding invoices',
            subtitle:
                'Track due balances, search customers or invoice numbers, and open invoice PDFs from mobile.',
          ),
          const SizedBox(height: 18),
          _SurfaceCard(
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    labelText: 'Search customer or invoice',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _status,
                  decoration: const InputDecoration(
                    labelText: 'Status',
                  ),
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All statuses')),
                    DropdownMenuItem(value: 'PENDING', child: Text('Pending')),
                    DropdownMenuItem(value: 'PARTIAL', child: Text('Partial')),
                    DropdownMenuItem(value: 'OVERDUE', child: Text('Overdue')),
                    DropdownMenuItem(value: 'PAID', child: Text('Paid')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _status = value ?? '';
                    });
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _loading ? null : _load,
                        icon: const Icon(Icons.filter_alt_outlined),
                        label: const Text('Apply'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _loading
                            ? null
                            : () {
                                _searchController.clear();
                                setState(() {
                                  _status = '';
                                });
                                _load();
                              },
                        child: const Text('Reset'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _SummaryCard(
                  label: 'Overdue',
                  value: '$overdueCount',
                  helper: 'Invoices already past due date',
                  tone: const Color(0xFFFBE7EA),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryCard(
                  label: 'Due Today',
                  value: '$dueTodayCount',
                  helper: 'Items needing attention today',
                  tone: const Color(0xFFFFF1E1),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(top: 80),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            _ErrorState(message: _error!, onRetry: _load)
          else if (_items.isEmpty)
            const _EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'No outstanding records found',
              subtitle: 'Try a different search term or status filter.',
            )
          else
            ..._items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _SurfaceCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.invoiceNumber,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(fontWeight: FontWeight.w800),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  item.customerName,
                                  style: Theme.of(context).textTheme.bodyLarge,
                                ),
                              ],
                            ),
                          ),
                          _StatusBadge(label: _formatStatus(item.status), tone: _statusColor(item.status)),
                        ],
                      ),
                      const SizedBox(height: 14),
                      _MetaLine(label: 'Invoice Date', value: _formatDate(item.invoiceDate)),
                      _MetaLine(label: 'Due Date', value: _formatDate(item.dueDate)),
                      _MetaLine(
                        label: 'Outstanding',
                        value: _currencyFormatter.format(item.outstandingAmount),
                      ),
                      const SizedBox(height: 12),
                      FilledButton.tonalIcon(
                        onPressed: () => _launchSecurePdf(
                          context,
                          ref,
                          '/invoices/${item.invoiceId}/pdf',
                        ),
                        icon: const Icon(Icons.picture_as_pdf_outlined),
                        label: const Text('View Invoice PDF'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class AmcScreen extends ConsumerStatefulWidget {
  const AmcScreen({super.key});

  @override
  ConsumerState<AmcScreen> createState() => _AmcScreenState();
}

class _AmcScreenState extends ConsumerState<AmcScreen> {
  final _searchController = TextEditingController();
  List<AmcItem> _items = const [];
  bool _loading = true;
  String _status = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await ref.read(mobilePortalRepositoryProvider).getAmcs(
            search: _searchController.text.trim(),
            status: _status,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = _readableError(error, 'Unable to load AMC records.');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final expiringSoonCount = _items.where((item) {
      if (item.endDate == null || item.status == 'CANCELLED') {
        return false;
      }

      final difference = item.endDate!
          .difference(DateTime(today.year, today.month, today.day))
          .inDays;
      return difference >= 0 && difference <= 30;
    }).length;
    final expiredCount = _items.where((item) {
      if (item.endDate == null) {
        return item.status == 'EXPIRED';
      }

      return item.status == 'EXPIRED' ||
          item.endDate!.isBefore(DateTime(today.year, today.month, today.day));
    }).length;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          const _SectionHeader(
            eyebrow: 'Admin Only',
            title: 'AMC contracts',
            subtitle:
                'Review expiring contracts, payment timing, contract details, and open AMC PDFs from mobile.',
          ),
          const SizedBox(height: 18),
          _SurfaceCard(
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    labelText: 'Search AMC or customer',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All statuses')),
                    DropdownMenuItem(value: 'ACTIVE', child: Text('Active')),
                    DropdownMenuItem(value: 'EXPIRED', child: Text('Expired')),
                    DropdownMenuItem(value: 'CANCELLED', child: Text('Cancelled')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _status = value ?? '';
                    });
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _loading ? null : _load,
                        icon: const Icon(Icons.filter_alt_outlined),
                        label: const Text('Apply'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _loading
                            ? null
                            : () {
                                _searchController.clear();
                                setState(() {
                                  _status = '';
                                });
                                _load();
                              },
                        child: const Text('Reset'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _SummaryCard(
                  label: 'Expiring Soon',
                  value: '$expiringSoonCount',
                  helper: 'Contracts ending within 30 days',
                  tone: const Color(0xFFFFF1E1),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryCard(
                  label: 'Expired',
                  value: '$expiredCount',
                  helper: 'Contracts needing urgent follow-up',
                  tone: const Color(0xFFFBE7EA),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(top: 80),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            _ErrorState(message: _error!, onRetry: _load)
          else if (_items.isEmpty)
            const _EmptyState(
              icon: Icons.support_agent_outlined,
              title: 'No AMC records found',
              subtitle: 'Try a different customer search or status filter.',
            )
          else
            ..._items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _SurfaceCard(
                  child: Theme(
                    data: Theme.of(context)
                        .copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      childrenPadding: EdgeInsets.zero,
                      title: Text(
                        item.amcNumber,
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text('${item.customerName} | ${item.branchName}'),
                      trailing: _StatusBadge(
                        label: _formatStatus(item.status),
                        tone: _statusColor(item.status),
                      ),
                      children: [
                        const SizedBox(height: 8),
                        _MetaLine(label: 'Contract Amount', value: _currencyFormatter.format(item.contractAmount)),
                        _MetaLine(label: 'Billing Period', value: _formatStatus(item.billingPeriod)),
                        _MetaLine(label: 'Start Date', value: _formatDate(item.startDate)),
                        _MetaLine(label: 'End Date', value: _formatDate(item.endDate)),
                        _MetaLine(label: 'Next Billing', value: _formatDate(item.nextBillingDate)),
                        _MetaLine(label: 'Last Paid', value: _formatDate(item.lastPaidDate)),
                        _MetaLine(label: 'Invoices Raised', value: '${item.invoiceCount}'),
                        if (item.note != null && item.note!.trim().isNotEmpty)
                          _MetaLine(label: 'Note', value: item.note!),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton.tonalIcon(
                                onPressed: () => _launchSecurePdf(
                                  context,
                                  ref,
                                  '/amc/${item.id}/pdf',
                                ),
                                icon: const Icon(Icons.picture_as_pdf_outlined),
                                label: const Text('AMC PDF'),
                              ),
                            ),
                          ],
                        ),
                        if (item.canCreateInvoice) ...[
                          const SizedBox(height: 10),
                          Text(
                            'Invoice creation is currently available for this contract.',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: const Color(0xFF486581),
                                ),
                          ),
                        ],
                      ],
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

class LeadsScreen extends ConsumerStatefulWidget {
  const LeadsScreen({super.key});

  @override
  ConsumerState<LeadsScreen> createState() => _LeadsScreenState();
}

class _LeadsScreenState extends ConsumerState<LeadsScreen> {
  final _searchController = TextEditingController();
  List<LeadItem> _items = const [];
  bool _loading = true;
  bool _saving = false;
  String _status = '';
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final items = await ref.read(mobilePortalRepositoryProvider).getLeads(
            search: _searchController.text.trim(),
            status: _status,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = _readableError(error, 'Unable to load leads.');
        _loading = false;
      });
    }
  }

  Future<void> _showUpdateStatusSheet(LeadItem lead) async {
    String selectedStatus = lead.status;
    DateTime? nextFollowUpDate = lead.nextFollowUpDate;
    final noteController = TextEditingController(text: lead.note ?? '');

    final result = await showModalBottomSheet<_LeadStatusDraft>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return SafeArea(
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  20,
                  20,
                  20,
                  20 + MediaQuery.viewInsetsOf(context).bottom,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Update Lead Status',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: selectedStatus,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(value: 'NEW', child: Text('New')),
                        DropdownMenuItem(value: 'CONTACTED', child: Text('Contacted')),
                        DropdownMenuItem(value: 'FOLLOW_UP', child: Text('Follow Up')),
                        DropdownMenuItem(value: 'DEMO_SCHEDULED', child: Text('Demo Scheduled')),
                        DropdownMenuItem(value: 'CONVERTED', child: Text('Converted')),
                        DropdownMenuItem(value: 'LOST', child: Text('Lost')),
                      ],
                      onChanged: (value) {
                        if (value == null) {
                          return;
                        }

                        setModalState(() {
                          selectedStatus = value;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () async {
                        final initialDate = nextFollowUpDate ?? DateTime.now();
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: initialDate,
                          firstDate: DateTime.now().subtract(const Duration(days: 365)),
                          lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
                        );

                        if (picked != null) {
                          setModalState(() {
                            nextFollowUpDate = picked;
                          });
                        }
                      },
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Next Follow-up Date',
                        ),
                        child: Row(
                          children: [
                            Text(_formatDate(nextFollowUpDate)),
                            const Spacer(),
                            IconButton(
                              onPressed: () {
                                setModalState(() {
                                  nextFollowUpDate = null;
                                });
                              },
                              icon: const Icon(Icons.close_rounded),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: noteController,
                      minLines: 3,
                      maxLines: 5,
                      decoration: const InputDecoration(
                        labelText: 'Note',
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(),
                          child: const Text('Cancel'),
                        ),
                        const Spacer(),
                        FilledButton(
                          onPressed: () => Navigator.of(context).pop(
                            _LeadStatusDraft(
                              status: selectedStatus,
                              nextFollowUpDate: nextFollowUpDate == null
                                  ? null
                                  : DateFormat('yyyy-MM-dd').format(nextFollowUpDate!),
                              note: noteController.text.trim(),
                            ),
                          ),
                          child: const Text('Save'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    noteController.dispose();

    if (result == null) {
      return;
    }

    setState(() {
      _saving = true;
    });

    try {
      await ref.read(mobilePortalRepositoryProvider).updateLeadStatus(
            leadId: lead.id,
            status: result.status,
            nextFollowUpDate: result.nextFollowUpDate,
            note: result.note.isEmpty ? null : result.note,
          );
      await _load();

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lead status updated.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_readableError(error, 'Unable to update lead status.'))),
      );
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  Future<void> _addNote(LeadItem lead) async {
    final controller = TextEditingController();
    final note = await showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Add Lead Note'),
          content: TextField(
            controller: controller,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(
              hintText: 'Type your note',
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(controller.text.trim()),
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
    controller.dispose();

    if (note == null || note.isEmpty) {
      return;
    }

    setState(() {
      _saving = true;
    });

    try {
      await ref.read(mobilePortalRepositoryProvider).addLeadNote(
            leadId: lead.id,
            note: note,
          );
      await _load();

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lead note added.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_readableError(error, 'Unable to add note.'))),
      );
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  Future<void> _markFollowUpCompleted(LeadItem lead) async {
    setState(() {
      _saving = true;
    });

    try {
      await ref.read(mobilePortalRepositoryProvider).updateLeadStatus(
            leadId: lead.id,
            status: lead.status == 'NEW' ? 'CONTACTED' : lead.status,
            note: 'Follow-up completed from mobile',
          );
      await _load();

      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Follow-up marked completed.')),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_readableError(error, 'Unable to complete follow-up.'))),
      );
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now();
    final followUpsToday = _items.where((item) {
      if (item.nextFollowUpDate == null) {
        return false;
      }

      if (item.status == 'CONVERTED' || item.status == 'LOST') {
        return false;
      }

      final date = item.nextFollowUpDate!;
      return DateTime(date.year, date.month, date.day)
          .isAtSameMomentAs(DateTime(today.year, today.month, today.day));
    }).length;
    final overdueFollowUps = _items.where((item) {
      if (item.nextFollowUpDate == null) {
        return false;
      }

      if (item.status == 'CONVERTED' || item.status == 'LOST') {
        return false;
      }

      final date = item.nextFollowUpDate!;
      return date.isBefore(DateTime(today.year, today.month, today.day));
    }).length;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          const _SectionHeader(
            eyebrow: 'Admin Only',
            title: 'Lead follow-ups',
            subtitle:
                'Review assigned leads, act on today follow-ups, update status, add notes, and close follow-up tasks from mobile.',
          ),
          const SizedBox(height: 18),
          _SurfaceCard(
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    labelText: 'Search lead, customer, phone, or source',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All statuses')),
                    DropdownMenuItem(value: 'NEW', child: Text('New')),
                    DropdownMenuItem(value: 'CONTACTED', child: Text('Contacted')),
                    DropdownMenuItem(value: 'FOLLOW_UP', child: Text('Follow Up')),
                    DropdownMenuItem(value: 'DEMO_SCHEDULED', child: Text('Demo Scheduled')),
                    DropdownMenuItem(value: 'CONVERTED', child: Text('Converted')),
                    DropdownMenuItem(value: 'LOST', child: Text('Lost')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _status = value ?? '';
                    });
                  },
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _loading ? null : _load,
                        icon: const Icon(Icons.filter_alt_outlined),
                        label: const Text('Apply'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _loading
                            ? null
                            : () {
                                _searchController.clear();
                                setState(() {
                                  _status = '';
                                });
                                _load();
                              },
                        child: const Text('Reset'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _SummaryCard(
                  label: 'Today Follow-ups',
                  value: '$followUpsToday',
                  helper: 'Leads due for action today',
                  tone: const Color(0xFFE8F2FF),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _SummaryCard(
                  label: 'Overdue',
                  value: '$overdueFollowUps',
                  helper: 'Follow-ups already overdue',
                  tone: const Color(0xFFFBE7EA),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(top: 80),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            _ErrorState(message: _error!, onRetry: _load)
          else if (_items.isEmpty)
            const _EmptyState(
              icon: Icons.campaign_outlined,
              title: 'No leads found',
              subtitle: 'Try another status or search phrase.',
            )
          else
            ..._items.map(
              (lead) {
                final isFollowUpDue = lead.nextFollowUpDate != null &&
                    lead.status != 'CONVERTED' &&
                    lead.status != 'LOST' &&
                    !lead.nextFollowUpDate!
                        .isAfter(DateTime(today.year, today.month, today.day));

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _SurfaceCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    lead.leadName,
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w800),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    '${lead.customerName} | ${lead.branchName}',
                                    style: Theme.of(context).textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                            ),
                            _StatusBadge(
                              label: _formatStatus(lead.status),
                              tone: _statusColor(lead.status),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        _MetaLine(label: 'Phone', value: lead.phone),
                        _MetaLine(label: 'Location', value: lead.location),
                        _MetaLine(
                          label: 'Assigned To',
                          value: lead.assignedToEmployeeName ?? 'Not assigned',
                        ),
                        _MetaLine(label: 'Source', value: lead.source),
                        _MetaLine(
                          label: 'Next Follow-up',
                          value: _formatDate(lead.nextFollowUpDate),
                        ),
                        if (lead.note != null && lead.note!.trim().isNotEmpty)
                          _MetaLine(label: 'Latest Note', value: lead.note!),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            FilledButton.tonalIcon(
                              onPressed: _saving ? null : () => _showUpdateStatusSheet(lead),
                              icon: const Icon(Icons.edit_note_outlined),
                              label: const Text('Update Status'),
                            ),
                            OutlinedButton.icon(
                              onPressed: _saving ? null : () => _addNote(lead),
                              icon: const Icon(Icons.note_add_outlined),
                              label: const Text('Add Note'),
                            ),
                            if (isFollowUpDue)
                              OutlinedButton.icon(
                                onPressed: _saving ? null : () => _markFollowUpCompleted(lead),
                                icon: const Icon(Icons.task_alt_outlined),
                                label: const Text('Mark Completed'),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

class LedgerScreen extends ConsumerStatefulWidget {
  const LedgerScreen({super.key});

  @override
  ConsumerState<LedgerScreen> createState() => _LedgerScreenState();
}

class _LedgerScreenState extends ConsumerState<LedgerScreen> {
  final _searchController = TextEditingController();
  LedgerPageResult? _pageResult;
  bool _loading = true;
  String? _error;
  String? _fromDate;
  String? _toDate;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool isFromDate}) async {
    final initial = DateTime.tryParse(
          isFromDate ? (_fromDate ?? '') : (_toDate ?? ''),
        ) ??
        DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now().subtract(const Duration(days: 3650)),
      lastDate: DateTime.now().add(const Duration(days: 3650)),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      final value = DateFormat('yyyy-MM-dd').format(picked);
      if (isFromDate) {
        _fromDate = value;
      } else {
        _toDate = value;
      }
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await ref.read(mobilePortalRepositoryProvider).getLedger(
            search: _searchController.text.trim(),
            fromDate: _fromDate,
            toDate: _toDate,
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _pageResult = result;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = _readableError(error, 'Unable to load ledger entries.');
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final result = _pageResult;

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        children: [
          const _SectionHeader(
            eyebrow: 'Admin Only',
            title: 'Ledger summary',
            subtitle:
                'Search customer and document entries, filter by date range, and review product/service and HSN or SAC totals from mobile.',
          ),
          const SizedBox(height: 18),
          _SurfaceCard(
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    labelText: 'Search customer, document, product, or HSN/SAC',
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () => _pickDate(isFromDate: true),
                        child: InputDecorator(
                          decoration: const InputDecoration(labelText: 'From Date'),
                          child: Text(_fromDate ?? 'Select date'),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(18),
                        onTap: () => _pickDate(isFromDate: false),
                        child: InputDecorator(
                          decoration: const InputDecoration(labelText: 'To Date'),
                          child: Text(_toDate ?? 'Select date'),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _loading ? null : _load,
                        icon: const Icon(Icons.filter_alt_outlined),
                        label: const Text('Apply'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _loading
                            ? null
                            : () {
                                _searchController.clear();
                                setState(() {
                                  _fromDate = null;
                                  _toDate = null;
                                });
                                _load();
                              },
                        child: const Text('Reset'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (result != null)
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _MiniMetricCard(
                  label: 'Total Amount',
                  value: _currencyFormatter.format(result.summary.totalAmount),
                ),
                _MiniMetricCard(
                  label: 'Total Tax',
                  value: _currencyFormatter.format(result.summary.totalTax),
                ),
                _MiniMetricCard(
                  label: 'Service Cost',
                  value: _currencyFormatter.format(result.summary.totalServiceCost),
                ),
                _MiniMetricCard(
                  label: 'Product Cost',
                  value: _currencyFormatter.format(result.summary.totalProductCost),
                ),
              ],
            ),
          const SizedBox(height: 16),
          if (_loading)
            const Padding(
              padding: EdgeInsets.only(top: 80),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            _ErrorState(message: _error!, onRetry: _load)
          else if (result == null || result.items.isEmpty)
            const _EmptyState(
              icon: Icons.account_balance_wallet_outlined,
              title: 'No ledger entries found',
              subtitle: 'Try widening the date range or clearing the search.',
            )
          else
            ...result.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _SurfaceCard(
                  child: Theme(
                    data: Theme.of(context)
                        .copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: EdgeInsets.zero,
                      childrenPadding: EdgeInsets.zero,
                      title: Text(
                        '${item.documentNumber} | ${item.customerName}',
                        style: Theme.of(context)
                            .textTheme
                            .titleMedium
                            ?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      subtitle: Text(
                        '${_formatStatus(item.type)} | ${item.branchName ?? 'No branch'}',
                      ),
                      trailing: _StatusBadge(
                        label: _formatStatus(item.status),
                        tone: _statusColor(item.status),
                      ),
                      children: [
                        const SizedBox(height: 8),
                        _MetaLine(label: 'Date', value: _formatDate(item.date)),
                        _MetaLine(label: 'Product / Service', value: item.productService),
                        _MetaLine(label: 'HSN / SAC', value: item.hsnSacCode),
                        _MetaLine(label: 'Debit', value: _currencyFormatter.format(item.debit)),
                        _MetaLine(label: 'Credit', value: _currencyFormatter.format(item.credit)),
                        _MetaLine(label: 'Balance', value: _currencyFormatter.format(item.balance)),
                        _MetaLine(label: 'Due Date', value: _formatDate(item.dueDate)),
                        if (item.lineItems.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text(
                            'Line Items',
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          ...item.lineItems.map(
                            (lineItem) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${lineItem.productServiceName} | ${lineItem.hsnSac}',
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(_currencyFormatter.format(lineItem.lineAmount)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
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

class _LeadStatusDraft {
  const _LeadStatusDraft({
    required this.status,
    required this.note,
    required this.nextFollowUpDate,
  });

  final String status;
  final String note;
  final String? nextFollowUpDate;
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.eyebrow,
    required this.title,
    required this.subtitle,
  });

  final String eyebrow;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow,
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: const Color(0xFF2563EB),
                fontWeight: FontWeight.w800,
                letterSpacing: 0.6,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          title,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF5F6C7B),
              ),
        ),
      ],
    );
  }
}

class _SurfaceCard extends StatelessWidget {
  const _SurfaceCard({
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: child,
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
    required this.helper,
    required this.tone,
  });

  final String label;
  final String value;
  final String helper;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: tone,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 6),
            Text(
              helper,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniMetricCard extends StatelessWidget {
  const _MiniMetricCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 156,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF5F6C7B),
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
    required this.tone,
  });

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: tone,
              fontWeight: FontWeight.w800,
            ),
      ),
    );
  }
}

class _MetaLine extends StatelessWidget {
  const _MetaLine({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 118,
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF5F6C7B),
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _HintChip extends StatelessWidget {
  const _HintChip({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F6FA),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 80),
      child: Column(
        children: [
          Icon(
            icon,
            size: 44,
            color: const Color(0xFF3B5B7A),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF5F6C7B),
                ),
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

  final String message;
  final FutureOr<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 60),
      child: Column(
        children: [
          const Icon(
            Icons.error_outline_rounded,
            size: 44,
            color: Color(0xFFC13D53),
          ),
          const SizedBox(height: 12),
          Text(
            message,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => onRetry(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
