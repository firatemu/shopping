import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role-based access control guard.
 * Checks if the authenticated user has at least one of the required roles.
 *
 * Roles hierarchy:
 * SUPER_ADMIN > TENANT_ADMIN > STORE_MANAGER > SENIOR_SALES > SALES_STAFF / CASHIER / ACCOUNTANT
 */

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    TENANT_ADMIN = 'TENANT_ADMIN',
    STORE_MANAGER = 'STORE_MANAGER',
    SENIOR_SALES = 'SENIOR_SALES',
    SALES_STAFF = 'SALES_STAFF',
    CASHIER = 'CASHIER',
    ACCOUNTANT = 'ACCOUNTANT',
}

@Injectable()
export class RbacGuard implements CanActivate {
    private readonly logger = new Logger(RbacGuard.name);

    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no roles are required, allow access
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || !user.role) {
            throw new ForbiddenException('Authentication required');
        }

        // SUPER_ADMIN has access to everything
        if (user.role === UserRole.SUPER_ADMIN) {
            return true;
        }

        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            this.logger.warn(
                `RBAC guard blocked: user=${user.id} role=${user.role} required=${requiredRoles.join(',')} tenantId=${user.tenantId}`,
            );
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}
