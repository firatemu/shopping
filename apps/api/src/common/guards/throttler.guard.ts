import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { THROTTLE_PROFILE_KEY, ThrottleProfile } from '../decorators/throttle.decorator';

/**
 * Tenant-aware per-tenant rate limiting guard.
 * Applied globally via APP_GUARD in AppModule.
 *
 * 5 named profiles:
 *  AUTH    — 10 req / 15 min   (login, register, refresh)
 *  BARCODE — 300 req / min     (barkod lookup)
 *  REPORT  — 20 req / min      (aggregation queries)
 *  BULK    — 30 req / min      (bulk operations)
 *  DEFAULT — 200 req / min     (general)
 *
 * Tracker = "{tenantId}:{ip}" — limits are per-tenant, not global.
 * Falls back to 'DEFAULT' when no @Throttle decorator is present.
 * Sets standard rate-limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After.
 *
 * Implementation: in-memory sliding window counter per tracker.
 * Production note: replace with Redis-backed storage via ThrottlerStorageService
 * when Redis is available in the same NestJS DI context.
 */

@Injectable()
export class TenantAwareThrottlerGuard implements CanActivate {
  private readonly errorMessage = 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.';

  // In-memory sliding window: tracker -> { count, resetAt }
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const profile = this.getProfile(context);
    const { limit, ttl } = PROFILE_CONFIG[profile];

    // Bypass throttling entirely in development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    const req = context.switchToHttp().getRequest<Record<string, unknown>>();
    const tracker = await this.getTracker(req);

    const { totalHits } = this.increment(tracker, ttl, limit);

    const remaining = Math.max(0, limit - totalHits);
    const res = context.switchToHttp().getResponse();
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Date.now() + ttl));

    if (totalHits > limit) {
      res.setHeader('Retry-After', String(Math.ceil(ttl / 1000)));
      throw new HttpException(this.errorMessage, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }

  private increment(
    tracker: string,
    ttl: number,
    limit: number,
  ): { totalHits: number; isBlocked: boolean } {
    const now = Date.now();
    const entry = this.store.get(tracker);

    if (!entry || entry.resetAt < now) {
      this.store.set(tracker, { count: 1, resetAt: now + ttl });
      return { totalHits: 1, isBlocked: false };
    }

    entry.count += 1;
    return { totalHits: entry.count, isBlocked: entry.count > limit };
  }

  private getProfile(context: ExecutionContext): ThrottleProfile {
    return (
      this.reflector.get<ThrottleProfile>(THROTTLE_PROFILE_KEY, context.getHandler()) ||
      this.reflector.get<ThrottleProfile>(THROTTLE_PROFILE_KEY, context.getClass()) ||
      'DEFAULT'
    );
  }

  private async getTracker(req: Record<string, unknown>): Promise<string> {
    const tenantId =
      (req['x-tenant-id'] as string) ||
      (req.headers as Record<string, string>)?.['x-tenant-id'] ||
      'anonymous';
    const ip =
      (req['ip'] as string) ||
      (req.headers as Record<string, string>)?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      'unknown';
    return `${tenantId}:${ip}`;
  }
}

const PROFILE_CONFIG: Record<ThrottleProfile, { limit: number; ttl: number }> = {
  AUTH: { limit: 10, ttl: 900_000 }, // 15 min
  BARCODE: { limit: 300, ttl: 60_000 }, // 1 min
  REPORT: { limit: 20, ttl: 60_000 }, // 1 min
  BULK: { limit: 30, ttl: 60_000 }, // 1 min
  DEFAULT: { limit: 200, ttl: 60_000 }, // 1 min
};
