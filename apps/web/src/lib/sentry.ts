/**
 * Sentry configuration.
 *
 * The scrubber is not optional and not a Phase 7 nicety: birth data is
 * sensitive personal data (CLAUDE.md #4), and the fastest way to leak it is an
 * exception payload. This runs from Phase 0 so there is never a window where
 * an error report could carry someone's birth time.
 */
const SENSITIVE_KEY = /birth|natal|dob|latitude|longitude|lat\b|lon\b|place|tz|subject|client/i;

export function scrubSensitive<T>(value: T, depth = 0): T {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => scrubSensitive(v, depth + 1)) as unknown as T;

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : scrubSensitive(v, depth + 1);
  }
  return out as T;
}

export const sentryOptions = {
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event: Record<string, unknown>) {
    return scrubSensitive(event);
  },
  beforeBreadcrumb(crumb: Record<string, unknown>) {
    return scrubSensitive(crumb);
  },
};
