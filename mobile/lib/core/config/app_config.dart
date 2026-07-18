class AppConfig {
  const AppConfig._();

  static const appName = 'HC';
  static const companyName = 'High Cooling Solutions';
  static const companyTagline = 'Smart Cooling. Reliable Solutions.';
  // Override with --dart-define for local emulator or staging builds.
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://star.castorwheel.co/api',
  );

  static const defaultMapLatitude = 10.123456;
  static const defaultMapLongitude = 76.123456;
}
