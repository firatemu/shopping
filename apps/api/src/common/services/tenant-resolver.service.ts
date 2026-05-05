import { Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * TenantResolverService — Central service for tenant context resolution.
 *
 * Architecture Rule #1: Every query MUST include tenant_id filter.
 * This service provides standardized methods for extracting and applying
 * tenant context in all service operations.
 */
@Injectable()
export class TenantResolverService {
    /**
     * Resolve tenant_id for READ operations.
     */
    resolveForQuery(request: Request): string {
        const tenantId = (request as any).tenantId as string | undefined;
        if (!tenantId) {
            throw new Error('Tenant context not available — TenantGuard should prevent this');
        }
        return tenantId;
    }

    /**
     * Resolve tenant_id for CREATE operations.
     */
    resolveForCreate(request: Request): string {
        return this.resolveForQuery(request);
    }

    /**
     * Build a Prisma WHERE clause that includes tenant isolation.
     */
    buildTenantWhereClause(tenantId: string): { tenantId: string; isDeleted: boolean } {
        return {
            tenantId,
            isDeleted: false,
        };
    }

    /**
     * Build data object with tenant_id for CREATE operations.
     */
    buildTenantCreateData(tenantId: string): { tenantId: string } {
        return { tenantId };
    }
}
