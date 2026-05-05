import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract tenant_id from the request.
 * Usage: @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        return request.tenantId;
    },
);

/**
 * Decorator to extract the current authenticated user from the request.
 * Usage: @CurrentUser() user: AuthenticatedUser
 */
export const CurrentUser = createParamDecorator(
    (data: string | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;
        return data ? user?.[data] : user;
    },
);
