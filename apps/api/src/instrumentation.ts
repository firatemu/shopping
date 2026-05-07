/**
 * Sentry instrumentation — initialise before any other import.
 * Must be the very first require() to capture all startup errors.
 */

import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  // Only initialise if DSN is provided (opt-in)
  enabled: Boolean(process.env.SENTRY_DSN),
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // Attach HTTP request bodies for error events
  sendDefaultPii: false,
  // Ignore health endpoint noise
  ignoreErrors: ['HealthCheckError'],
});
