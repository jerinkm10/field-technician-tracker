export function parseCorsOrigins(value?: string | null): true | string[] {
  if (!value) {
    return true;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    return true;
  }

  return origins;
}
