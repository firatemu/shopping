import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
    private readonly logger = new Logger(HealthService.name);
    private readonly redis: Redis;
    private readonly startTime: number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
    ) {
        this.startTime = Date.now();
        this.redis = new Redis({
            host: this.config.get<string>('REDIS_HOST', 'localhost'),
            port: this.config.get<number>('REDIS_PORT', 6379),
            password: this.config.get<string>('REDIS_PASSWORD', ''),
            maxRetriesPerRequest: 1,
            lazyConnect: true,
        });
    }

    async check(): Promise<{
        status: 'ok' | 'degraded' | 'error';
        timestamp: string;
        uptime: number;
        version: string;
        services: {
            database: { status: string; latency?: number };
            redis: { status: string; latency?: number };
        };
    }> {
        const [dbHealth, redisHealth] = await Promise.all([
            this.checkDatabase(),
            this.checkRedis(),
        ]);

        const allUp = dbHealth.status === 'up' && redisHealth.status === 'up';
        const allDown = dbHealth.status === 'down' && redisHealth.status === 'down';

        let status: 'ok' | 'degraded' | 'error';
        if (allUp) {
            status = 'ok';
        } else if (allDown) {
            status = 'error';
        } else {
            status = 'degraded';
        }

        return {
            status,
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            version: process.env.npm_package_version ?? '1.0.0',
            services: {
                database: dbHealth,
                redis: redisHealth,
            },
        };
    }

    private async checkDatabase(): Promise<{ status: string; latency?: number }> {
        const start = Date.now();
        try {
            const healthy = await this.prisma.isHealthy();
            const latency = Date.now() - start;
            return { status: healthy ? 'up' : 'down', latency };
        } catch (error) {
            this.logger.error('Database health check failed', error);
            return { status: 'down' };
        }
    }

    private async checkRedis(): Promise<{ status: string; latency?: number }> {
        const start = Date.now();
        try {
            await this.redis.connect();
            await this.redis.ping();
            const latency = Date.now() - start;
            await this.redis.disconnect();
            return { status: 'up', latency };
        } catch (error) {
            this.logger.error('Redis health check failed', error);
            try {
                await this.redis.disconnect();
            } catch {
                // Ignore disconnect errors
            }
            return { status: 'down' };
        }
    }
}
