class AppUser {
  const AppUser({
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

  bool get isAdmin => role == 'ADMIN' || role == 'ADMIN_OWNER';
  bool get isTechnician => role == 'TECHNICIAN';
  bool get canUseMobileApp => isAdmin || isTechnician;

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      username: json['username'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'username': username,
      'email': email,
      'role': role,
    };
  }
}
