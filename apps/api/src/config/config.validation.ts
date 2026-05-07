/**
 * Environment variable validation schema.
 * Application will NOT start if any required variable is missing.
 * Optional variables that affect functionality are also validated with warnings.
 */
export const configValidationSchema = {
  validate: (config: Record<string, unknown>): Record<string, unknown> => {
    const requiredVars: Array<{ key: string; description: string }> = [
      { key: 'DATABASE_URL', description: 'PostgreSQL connection string' },
      { key: 'REDIS_HOST', description: 'Redis server hostname' },
      { key: 'JWT_SECRET', description: 'JWT signing secret (min 32 chars)' },
      { key: 'JWT_REFRESH_SECRET', description: 'JWT refresh token secret (min 32 chars)' },
    ];

    const missing: string[] = [];

    for (const { key, description } of requiredVars) {
      if (!config[key]) {
        missing.push(`  ✗ ${key} — ${description}`);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `\n\u274c Missing required environment variables:\n${missing.join('\n')}\n\n` +
          `Copy .env.example to .env and fill in the values.\n`,
      );
    }

    // Validate JWT_SECRET minimum length
    const jwtSecret = config['JWT_SECRET'] as string;
    if (jwtSecret && jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    const jwtRefreshSecret = config['JWT_REFRESH_SECRET'] as string;
    if (jwtRefreshSecret && jwtRefreshSecret.length < 32) {
      throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
    }

    // Validate STORAGE_* consistency — all or none for S3/R2/MinIO
    const storageVars = [
      'STORAGE_ENDPOINT',
      'STORAGE_BUCKET',
      'STORAGE_ACCESS_KEY',
      'STORAGE_SECRET_KEY',
    ];
    const storageSet = storageVars.filter(
      (k) => config[k] && (config[k] as string).trim().length > 0,
    );
    if (storageSet.length > 0 && storageSet.length < storageVars.length) {
      const missingStorage = storageVars.filter((k) => !storageSet.includes(k));
      throw new Error(
        `Storage variables incomplete — set all or none of: ${storageVars.join(', ')}\n` +
          `Missing: ${missingStorage.join(', ')}`,
      );
    }

    // Optional: SENTRY_DSN — warn if not set in production
    if (!config['SENTRY_DSN'] && process.env.NODE_ENV === 'production') {
      console.warn('\u26a0\ufe0f  SENTRY_DSN not set — error monitoring disabled in production');
    }

    return config;
  },
};
