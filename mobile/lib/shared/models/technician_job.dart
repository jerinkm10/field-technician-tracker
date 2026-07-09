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
    required this.visits,
    required this.assignments,
    this.startedAt,
    this.completedAt,
    this.technician,
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
  final AssignedTechnician? technician;
  final List<JobVisit> visits;
  final List<JobAssignmentMember> assignments;

  JobVisit? get latestVisit => visits.isEmpty ? null : visits.first;
  String get assignedMemberSummary {
    if (assignments.isNotEmpty) {
      return assignments
          .map((assignment) => assignment.user.name)
          .join(', ');
    }

    return technician?.user.name ?? 'Unassigned';
  }

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
      technician: json['technician'] is Map
          ? AssignedTechnician.fromJson(
              Map<String, dynamic>.from(json['technician'] as Map),
            )
          : null,
      assignments: (json['assignments'] as List? ?? const [])
          .whereType<Map>()
          .map(
            (assignment) => JobAssignmentMember.fromJson(
              Map<String, dynamic>.from(assignment),
            ),
          )
          .toList(),
      visits: (json['visits'] as List? ?? const [])
          .whereType<Map>()
          .map(
            (visit) => JobVisit.fromJson(
              Map<String, dynamic>.from(visit),
            ),
          )
          .toList(),
    );
  }
}

class JobAssignmentMember {
  const JobAssignmentMember({
    required this.id,
    required this.userId,
    required this.roleType,
    required this.status,
    required this.assignedAt,
    required this.user,
  });

  final String id;
  final String userId;
  final String roleType;
  final String status;
  final DateTime? assignedAt;
  final AssignedTechnicianUser user;

  factory JobAssignmentMember.fromJson(Map<String, dynamic> json) {
    return JobAssignmentMember(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      roleType: json['roleType'] as String? ?? '',
      status: json['status'] as String? ?? '',
      assignedAt: json['assignedAt'] == null
          ? null
          : DateTime.tryParse(json['assignedAt'] as String),
      user: AssignedTechnicianUser.fromJson(
        Map<String, dynamic>.from(json['user'] as Map? ?? const {}),
      ),
    );
  }
}

class AssignedTechnician {
  const AssignedTechnician({
    required this.id,
    required this.phone,
    required this.status,
    required this.user,
    this.currentLatitude,
    this.currentLongitude,
    this.lastSeenAt,
  });

  final String id;
  final String phone;
  final String status;
  final double? currentLatitude;
  final double? currentLongitude;
  final DateTime? lastSeenAt;
  final AssignedTechnicianUser user;

  factory AssignedTechnician.fromJson(Map<String, dynamic> json) {
    return AssignedTechnician(
      id: json['id'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      status: json['status'] as String? ?? '',
      currentLatitude: (json['currentLatitude'] as num?)?.toDouble(),
      currentLongitude: (json['currentLongitude'] as num?)?.toDouble(),
      lastSeenAt: json['lastSeenAt'] == null
          ? null
          : DateTime.tryParse(json['lastSeenAt'] as String),
      user: AssignedTechnicianUser.fromJson(
        Map<String, dynamic>.from(json['user'] as Map? ?? const {}),
      ),
    );
  }
}

class AssignedTechnicianUser {
  const AssignedTechnicianUser({
    required this.id,
    required this.name,
    required this.username,
    required this.email,
    required this.role,
  });

  final String id;
  final String name;
  final String username;
  final String email;
  final String role;

  factory AssignedTechnicianUser.fromJson(Map<String, dynamic> json) {
    return AssignedTechnicianUser(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      username: json['username'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? '',
    );
  }
}

class JobVisit {
  const JobVisit({
    required this.id,
    required this.technicianId,
    this.checkInAt,
    this.checkOutAt,
    this.timeSpentMinutes,
    this.startLatitude,
    this.startLongitude,
    this.endLatitude,
    this.endLongitude,
  });

  final String id;
  final String technicianId;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;
  final int? timeSpentMinutes;
  final double? startLatitude;
  final double? startLongitude;
  final double? endLatitude;
  final double? endLongitude;

  factory JobVisit.fromJson(Map<String, dynamic> json) {
    return JobVisit(
      id: json['id'] as String? ?? '',
      technicianId: json['technicianId'] as String? ?? '',
      checkInAt: json['checkInAt'] == null
          ? null
          : DateTime.tryParse(json['checkInAt'] as String),
      checkOutAt: json['checkOutAt'] == null
          ? null
          : DateTime.tryParse(json['checkOutAt'] as String),
      timeSpentMinutes: json['timeSpentMinutes'] as int?,
      startLatitude: (json['startLatitude'] as num?)?.toDouble(),
      startLongitude: (json['startLongitude'] as num?)?.toDouble(),
      endLatitude: (json['endLatitude'] as num?)?.toDouble(),
      endLongitude: (json['endLongitude'] as num?)?.toDouble(),
    );
  }
}
