import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../guards/rbac.guard';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for a route handler.
 * Usage: @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
