import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/** Same UUID validation as TenantContextMiddleware. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * TenantGuard ensures every request has a valid tenant_id.
 * This is the NestJS application-layer guard (first layer).
 * PostgreSQL RLS is the second layer.
 *
 * Architecture Rule #1: No query may execute without a tenant_id filter.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { tenantId?: string; user?: { tenantId?: string } }>();
    const middlewareTenant =
      typeof request.tenantId === 'string' && request.tenantId.trim()
        ? request.tenantId.trim()
        : undefined;

    let tenantId: string | undefined = middlewareTenant;

    const rawHeader = request.headers['x-tenant-id'];
    const headerTenant =
      typeof rawHeader === 'string' && rawHeader.trim() ? rawHeader.trim() : undefined;

    if (headerTenant && !UUID_REGEX.test(headerTenant)) {
      throw new UnauthorizedException('Invalid tenant ID format');
    }

    if (!tenantId && headerTenant) {
      tenantId = headerTenant;
    }

    const jwtTenant = request.user?.tenantId;
    if (!tenantId && jwtTenant) {
      tenantId = jwtTenant;
    }

    if (!tenantId) {
      this.logger.warn(
        `Tenant guard blocked request: missing tenant_id — path: ${request.path} — ip: ${request.ip}`,
      );
      throw new ForbiddenException('Tenant context is required');
    }

    if (jwtTenant && tenantId !== jwtTenant) {
      this.logger.warn(
        `Tenant mismatch: resolved tenant vs JWT user tenant — path=${request.path}`,
      );
      throw new ForbiddenException('Tenant mismatch with authenticated user');
    }

    request.tenantId = tenantId;

    return true;
  }
}
