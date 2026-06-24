type RuntimeAppConfig = {
  apiBaseUrl?: string;
  socketUrl?: string;
  googleMapsApiKey?: string;
};

const runtimeConfig =
  (globalThis as typeof globalThis & { __APP_CONFIG__?: RuntimeAppConfig }).__APP_CONFIG__ ?? {};

function trimTrailingSlash(value: string): string {
  if (!value || value === '/') {
    return value || '/';
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getWindowOrigin(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:4200';
  }

  return window.location.origin;
}

export const appSettings = {
  appName: 'Field Technician Tracker',
  apiBaseUrl: trimTrailingSlash(runtimeConfig.apiBaseUrl?.trim() || '/api'),
  socketUrl: trimTrailingSlash(runtimeConfig.socketUrl?.trim() || getWindowOrigin()),
  googleMapsApiKey: runtimeConfig.googleMapsApiKey?.trim() || ''
} as const;
