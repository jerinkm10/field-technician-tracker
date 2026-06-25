class AppConfig {
  const AppConfig._();

  static const appName = 'High Cooling Solution';
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3007',
  );

  static const defaultMapLatitude = 10.123456;
  static const defaultMapLongitude = 76.123456;
}
