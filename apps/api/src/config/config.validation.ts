/**
 * Environment variable validation schema.
 * Application will NOT start if any required variable is missing.
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
                missing.push(`  ❌ ${key} — ${description}`);
            }
        }

        if (missing.length > 0) {
            throw new Error(
                `\n🚨 Missing required environment variables:\n${missing.join('\n')}\n\n` +
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

        return config;
    },
};
