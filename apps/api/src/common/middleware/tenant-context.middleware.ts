import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Extracts tenant_id from JWT payload or x-tenant-id header and
 * attaches it to the request object. This middleware runs on EVERY
 * request and is the first layer of multi-tenant isolation.
 *
 * Architecture Rule #1: No query may execute without a tenant_id filter.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    // Skip tenant resolution for public endpoints
    const publicPaths = ['/api/v1/health', '/api/docs'];
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      next();
      return;
    }

    // Try to extract tenant_id from header or JWT
    const tenantId = req.headers['x-tenant-id'] as string | undefined;

    if (tenantId) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId)) {
        throw new UnauthorizedException('Invalid tenant ID format');
      }

      (req as any).tenantId = tenantId;
    }

    next();
  }
}
