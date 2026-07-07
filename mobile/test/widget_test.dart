import 'package:field_technician_tracker/main.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('shows the HC login shell', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: FieldTechnicianTrackerApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });
}
