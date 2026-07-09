Map<String, dynamic> _map(dynamic value) {
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }

  return const <String, dynamic>{};
}

List<Map<String, dynamic>> _mapList(dynamic value) {
  if (value is! List) {
    return const <Map<String, dynamic>>[];
  }

  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}

String _string(dynamic value) {
  return value?.toString() ?? '';
}

double? _double(dynamic value) {
  if (value is num) {
    return value.toDouble();
  }

  if (value is String) {
    return double.tryParse(value);
  }

  return null;
}

int _int(dynamic value) {
  if (value is int) {
    return value;
  }

  if (value is num) {
    return value.toInt();
  }

  if (value is String) {
    return int.tryParse(value) ?? 0;
  }

  return 0;
}

DateTime? _date(dynamic value) {
  if (value is String) {
    return DateTime.tryParse(value);
  }

  return null;
}

class CustomerLookup {
  const CustomerLookup({
    required this.id,
    required this.name,
    required this.phone,
    required this.address,
    this.latitude,
    this.longitude,
  });

  final String id;
  final String name;
  final String phone;
  final String address;
  final double? latitude;
  final double? longitude;

  factory CustomerLookup.fromJson(Map<String, dynamic> json) {
    return CustomerLookup(
      id: _string(json['id']),
      name: _string(json['customerName']),
      phone: _string(json['phone']),
      address: _string(json['address']),
      latitude: _double(json['latitude']),
      longitude: _double(json['longitude']),
    );
  }
}

class EmployeeLookup {
  const EmployeeLookup({
    required this.id,
    required this.name,
    required this.username,
    required this.role,
  });

  final String id;
  final String name;
  final String username;
  final String role;

  String get label => '$name ($role)';

  factory EmployeeLookup.fromJson(Map<String, dynamic> json) {
    return EmployeeLookup(
      id: _string(json['id']),
      name: _string(json['name']),
      username: _string(json['username']),
      role: _string(json['role']),
    );
  }
}

class BranchLookup {
  const BranchLookup({
    required this.id,
    required this.name,
    required this.phone,
  });

  final String id;
  final String name;
  final String phone;

  factory BranchLookup.fromJson(Map<String, dynamic> json) {
    return BranchLookup(
      id: _string(json['id']),
      name: _string(json['supplierName']),
      phone: _string(json['phone']),
    );
  }
}

class MapUser {
  const MapUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  final String id;
  final String name;
  final String email;
  final String role;

  factory MapUser.fromJson(Map<String, dynamic> json) {
    return MapUser(
      id: _string(json['id']),
      name: _string(json['name']),
      email: _string(json['email']),
      role: _string(json['role']),
    );
  }
}

class MapCustomer {
  const MapCustomer({
    required this.id,
    required this.name,
    required this.address,
    this.latitude,
    this.longitude,
  });

  final String id;
  final String name;
  final String address;
  final double? latitude;
  final double? longitude;

  bool get hasCoordinates => latitude != null && longitude != null;

  factory MapCustomer.fromJson(Map<String, dynamic> json) {
    return MapCustomer(
      id: _string(json['id']),
      name: _string(json['name']),
      address: _string(json['address']),
      latitude: _double(json['latitude']),
      longitude: _double(json['longitude']),
    );
  }
}

class RouteJob {
  const RouteJob({
    required this.id,
    required this.jobNumber,
    required this.title,
    required this.status,
    required this.routeStatus,
    required this.scheduledDate,
    required this.customer,
  });

  final String id;
  final String jobNumber;
  final String title;
  final String status;
  final String routeStatus;
  final DateTime? scheduledDate;
  final MapCustomer customer;

  factory RouteJob.fromJson(Map<String, dynamic> json) {
    return RouteJob(
      id: _string(json['id']),
      jobNumber: _string(json['jobNumber']),
      title: _string(json['title']),
      status: _string(json['status']),
      routeStatus: _string(json['routeStatus']),
      scheduledDate: _date(json['scheduledDate']),
      customer: MapCustomer.fromJson(_map(json['customer'])),
    );
  }
}

class MapJob {
  const MapJob({
    required this.id,
    required this.jobNumber,
    required this.title,
    required this.status,
    this.scheduledDate,
    this.customer,
  });

  final String id;
  final String jobNumber;
  final String title;
  final String status;
  final DateTime? scheduledDate;
  final MapCustomer? customer;

  factory MapJob.fromJson(Map<String, dynamic> json) {
    final customerJson = json['customer'];

    return MapJob(
      id: _string(json['id']),
      jobNumber: _string(json['jobNumber']),
      title: _string(json['title']),
      status: _string(json['status']),
      scheduledDate: _date(json['scheduledDate']),
      customer: customerJson is Map
          ? MapCustomer.fromJson(_map(customerJson))
          : null,
    );
  }
}

class MapLocation {
  const MapLocation({
    required this.id,
    required this.technicianId,
    required this.latitude,
    required this.longitude,
    required this.recordedAt,
    this.job,
  });

  final String id;
  final String technicianId;
  final double latitude;
  final double longitude;
  final DateTime? recordedAt;
  final MapJob? job;

  factory MapLocation.fromJson(Map<String, dynamic> json) {
    final jobJson = json['job'];

    return MapLocation(
      id: _string(json['id']),
      technicianId: _string(json['technicianId']),
      latitude: _double(json['latitude']) ?? 0,
      longitude: _double(json['longitude']) ?? 0,
      recordedAt: _date(json['recordedAt']),
      job: jobJson is Map ? MapJob.fromJson(_map(jobJson)) : null,
    );
  }
}

class LiveMapTechnician {
  const LiveMapTechnician({
    required this.id,
    required this.phone,
    required this.status,
    required this.user,
    required this.todayRouteJobs,
    this.currentLatitude,
    this.currentLongitude,
    this.lastSeenAt,
    this.activeJob,
    this.latestLocation,
  });

  final String id;
  final String phone;
  final String status;
  final double? currentLatitude;
  final double? currentLongitude;
  final DateTime? lastSeenAt;
  final MapUser user;
  final MapJob? activeJob;
  final MapLocation? latestLocation;
  final List<RouteJob> todayRouteJobs;

  bool get hasCoordinates =>
      currentLatitude != null && currentLongitude != null ||
      latestLocation != null;

  double? get latitude => currentLatitude ?? latestLocation?.latitude;
  double? get longitude => currentLongitude ?? latestLocation?.longitude;

  factory LiveMapTechnician.fromJson(Map<String, dynamic> json) {
    final activeJobJson = json['activeJob'];
    final latestLocationJson = json['latestLocation'];

    return LiveMapTechnician(
      id: _string(json['id']),
      phone: _string(json['phone']),
      status: _string(json['status']),
      currentLatitude: _double(json['currentLatitude']),
      currentLongitude: _double(json['currentLongitude']),
      lastSeenAt: _date(json['lastSeenAt']),
      user: MapUser.fromJson(_map(json['user'])),
      activeJob: activeJobJson is Map ? MapJob.fromJson(_map(activeJobJson)) : null,
      latestLocation: latestLocationJson is Map
          ? MapLocation.fromJson(_map(latestLocationJson))
          : null,
      todayRouteJobs: _mapList(json['todayRouteJobs'])
          .map(RouteJob.fromJson)
          .toList(),
    );
  }
}

class OutstandingItem {
  const OutstandingItem({
    required this.id,
    required this.invoiceId,
    required this.invoiceType,
    required this.invoiceNumber,
    required this.customerName,
    required this.invoiceDate,
    required this.dueDate,
    required this.outstandingAmount,
    required this.status,
  });

  final String id;
  final String invoiceId;
  final String invoiceType;
  final String invoiceNumber;
  final String customerName;
  final DateTime? invoiceDate;
  final DateTime? dueDate;
  final double outstandingAmount;
  final String status;

  factory OutstandingItem.fromJson(Map<String, dynamic> json) {
    return OutstandingItem(
      id: _string(json['id']),
      invoiceId: _string(json['invoiceId']),
      invoiceType: _string(json['invoiceType']),
      invoiceNumber: _string(json['invoiceNumber']),
      customerName: _string(json['customerName']),
      invoiceDate: _date(json['invoiceDate']),
      dueDate: _date(json['dueDate']),
      outstandingAmount: _double(json['outstandingAmount']) ?? 0,
      status: _string(json['status']),
    );
  }
}

class AmcItem {
  const AmcItem({
    required this.id,
    required this.amcNumber,
    required this.customerName,
    required this.branchName,
    required this.billingPeriod,
    required this.contractAmount,
    required this.status,
    required this.invoiceCount,
    required this.canCreateInvoice,
    this.startDate,
    this.endDate,
    this.nextBillingDate,
    this.lastPaidDate,
    this.note,
  });

  final String id;
  final String amcNumber;
  final String customerName;
  final String branchName;
  final String billingPeriod;
  final double contractAmount;
  final String status;
  final int invoiceCount;
  final bool canCreateInvoice;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateTime? nextBillingDate;
  final DateTime? lastPaidDate;
  final String? note;

  factory AmcItem.fromJson(Map<String, dynamic> json) {
    return AmcItem(
      id: _string(json['id']),
      amcNumber: _string(json['amcNumber']),
      customerName: _string(json['customerName']),
      branchName: _string(_map(json['branch'])['supplierName']),
      billingPeriod: _string(json['billingPeriod']),
      contractAmount: _double(json['contractAmount']) ?? 0,
      status: _string(json['status']),
      invoiceCount: (json['invoices'] as List?)?.length ?? 0,
      canCreateInvoice: json['canCreateInvoice'] == true,
      startDate: _date(json['startDate']),
      endDate: _date(json['endDate']),
      nextBillingDate: _date(json['nextBillingDate']),
      lastPaidDate: _date(json['lastPaidDate']),
      note: json['note'] == null ? null : _string(json['note']),
    );
  }
}

class LeadItem {
  const LeadItem({
    required this.id,
    required this.leadName,
    required this.customerName,
    required this.phone,
    required this.location,
    required this.branchName,
    required this.source,
    required this.status,
    this.assignedToEmployeeId,
    this.assignedToEmployeeName,
    this.note,
    this.nextFollowUpDate,
  });

  final String id;
  final String leadName;
  final String customerName;
  final String phone;
  final String location;
  final String branchName;
  final String source;
  final String status;
  final String? assignedToEmployeeId;
  final String? assignedToEmployeeName;
  final String? note;
  final DateTime? nextFollowUpDate;

  factory LeadItem.fromJson(Map<String, dynamic> json) {
    final employee = _map(json['assignedToEmployee']);

    return LeadItem(
      id: _string(json['id']),
      leadName: _string(json['leadName']),
      customerName: _string(json['customerName']),
      phone: _string(json['phone']),
      location: _string(json['location']),
      branchName: _string(json['branchName']),
      source: _string(json['source']),
      status: _string(json['status']),
      assignedToEmployeeId: json['assignedToEmployeeId'] == null
          ? null
          : _string(json['assignedToEmployeeId']),
      assignedToEmployeeName:
          employee.isEmpty ? null : _string(employee['name']),
      note: json['note'] == null ? null : _string(json['note']),
      nextFollowUpDate: _date(json['nextFollowUpDate']),
    );
  }
}

class LedgerLineItem {
  const LedgerLineItem({
    required this.productServiceName,
    required this.hsnSac,
    required this.lineAmount,
  });

  final String productServiceName;
  final String hsnSac;
  final double lineAmount;

  factory LedgerLineItem.fromJson(Map<String, dynamic> json) {
    return LedgerLineItem(
      productServiceName: _string(json['productServiceName']),
      hsnSac: _string(json['hsnSac']),
      lineAmount: _double(json['lineAmount']) ?? 0,
    );
  }
}

class LedgerItem {
  const LedgerItem({
    required this.id,
    required this.type,
    required this.documentNumber,
    required this.customerName,
    required this.productService,
    required this.hsnSacCode,
    required this.debit,
    required this.credit,
    required this.balance,
    required this.status,
    required this.lineItems,
    this.date,
    this.dueDate,
    this.branchName,
  });

  final String id;
  final String type;
  final String documentNumber;
  final String customerName;
  final String productService;
  final String hsnSacCode;
  final double debit;
  final double credit;
  final double balance;
  final String status;
  final DateTime? date;
  final DateTime? dueDate;
  final String? branchName;
  final List<LedgerLineItem> lineItems;

  factory LedgerItem.fromJson(Map<String, dynamic> json) {
    return LedgerItem(
      id: _string(json['id']),
      type: _string(json['type']),
      documentNumber: _string(json['documentNumber']),
      customerName: _string(json['customerName']),
      productService: _string(json['productService']),
      hsnSacCode: _string(json['hsnSacCode']),
      debit: _double(json['debit']) ?? 0,
      credit: _double(json['credit']) ?? 0,
      balance: _double(json['balance']) ?? 0,
      status: _string(json['status']),
      date: _date(json['date']),
      dueDate: _date(json['dueDate']),
      branchName: json['branchName'] == null ? null : _string(json['branchName']),
      lineItems: _mapList(json['lineItems']).map(LedgerLineItem.fromJson).toList(),
    );
  }
}

class LedgerSummary {
  const LedgerSummary({
    required this.totalAmount,
    required this.totalTax,
    required this.totalServiceCost,
    required this.totalProductCost,
  });

  final double totalAmount;
  final double totalTax;
  final double totalServiceCost;
  final double totalProductCost;

  factory LedgerSummary.fromJson(Map<String, dynamic> json) {
    return LedgerSummary(
      totalAmount: _double(json['totalAmount']) ?? 0,
      totalTax: _double(json['totalTax']) ?? 0,
      totalServiceCost: _double(json['totalServiceCost']) ?? 0,
      totalProductCost: _double(json['totalProductCost']) ?? 0,
    );
  }
}

class LedgerPageResult {
  const LedgerPageResult({
    required this.items,
    required this.summary,
  });

  final List<LedgerItem> items;
  final LedgerSummary summary;

  factory LedgerPageResult.fromJson(Map<String, dynamic> json) {
    return LedgerPageResult(
      items: _mapList(json['data']).map(LedgerItem.fromJson).toList(),
      summary: LedgerSummary.fromJson(_map(json['summary'])),
    );
  }
}

class MobileNotification {
  const MobileNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.referenceType,
    required this.referenceId,
    required this.isRead,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String message;
  final String referenceType;
  final String referenceId;
  final bool isRead;
  final DateTime? createdAt;

  factory MobileNotification.fromJson(Map<String, dynamic> json) {
    return MobileNotification(
      id: _string(json['id']),
      title: _string(json['title']),
      message: _string(json['message']),
      referenceType: _string(json['referenceType']),
      referenceId: _string(json['referenceId']),
      isRead: json['isRead'] == true,
      createdAt: _date(json['createdAt']),
    );
  }
}

class NotificationListResult {
  const NotificationListResult({
    required this.items,
    required this.unreadCount,
  });

  final List<MobileNotification> items;
  final int unreadCount;

  factory NotificationListResult.fromJson(Map<String, dynamic> json) {
    return NotificationListResult(
      items: _mapList(json['data']).map(MobileNotification.fromJson).toList(),
      unreadCount: _int(json['unreadCount']),
    );
  }
}

class AttendanceSession {
  const AttendanceSession({
    required this.id,
    required this.checkInAt,
    this.checkOutAt,
    this.checkInLatitude,
    this.checkInLongitude,
    this.checkInAccuracy,
    this.checkOutLatitude,
    this.checkOutLongitude,
    this.checkOutAccuracy,
  });

  final String id;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;
  final double? checkInLatitude;
  final double? checkInLongitude;
  final double? checkInAccuracy;
  final double? checkOutLatitude;
  final double? checkOutLongitude;
  final double? checkOutAccuracy;

  bool get isActive => checkOutAt == null;

  factory AttendanceSession.fromJson(Map<String, dynamic> json) {
    return AttendanceSession(
      id: _string(json['id']),
      checkInAt: _date(json['checkInAt']),
      checkOutAt: _date(json['checkOutAt']),
      checkInLatitude: _double(json['checkInLatitude']),
      checkInLongitude: _double(json['checkInLongitude']),
      checkInAccuracy: _double(json['checkInAccuracy']),
      checkOutLatitude: _double(json['checkOutLatitude']),
      checkOutLongitude: _double(json['checkOutLongitude']),
      checkOutAccuracy: _double(json['checkOutAccuracy']),
    );
  }
}

class AttendanceOverview {
  const AttendanceOverview({
    required this.recentSessions,
    this.activeSession,
  });

  final AttendanceSession? activeSession;
  final List<AttendanceSession> recentSessions;

  factory AttendanceOverview.fromJson(Map<String, dynamic> json) {
    final activeSessionJson = json['activeSession'];

    return AttendanceOverview(
      activeSession: activeSessionJson is Map
          ? AttendanceSession.fromJson(_map(activeSessionJson))
          : null,
      recentSessions: _mapList(json['recentSessions'])
          .map(AttendanceSession.fromJson)
          .toList(),
    );
  }
}
