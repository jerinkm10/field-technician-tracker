import 'customer_info.dart';

class TechnicianJob {
  const TechnicianJob({
    required this.id,
    required this.jobNumber,
    required this.title,
    required this.description,
    required this.status,
    required this.scheduledDate,
    required this.customer,
    this.startedAt,
    this.completedAt,
  });

  final String id;
  final String jobNumber;
  final String title;
  final String description;
  final String status;
  final DateTime scheduledDate;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final CustomerInfo customer;

  factory TechnicianJob.fromJson(Map<String, dynamic> json) {
    return TechnicianJob(
      id: json['id'] as String? ?? '',
      jobNumber: json['jobNumber'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? '',
      scheduledDate: DateTime.parse(
        json['scheduledDate'] as String? ?? DateTime.now().toIso8601String(),
      ),
      startedAt: json['startedAt'] == null
          ? null
          : DateTime.tryParse(json['startedAt'] as String),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.tryParse(json['completedAt'] as String),
      customer: CustomerInfo.fromJson(
        Map<String, dynamic>.from(json['customer'] as Map? ?? const {}),
      ),
    );
  }
}
