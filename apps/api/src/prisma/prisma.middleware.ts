/**
 * Prisma Soft Delete Extension
 *
 * Architecture Rule #3: Soft delete — auto-append is_deleted = false
 *
 * Intercepts all Prisma operations for soft-deletable models:
 * 1. Auto-injects `isDeleted: false` to all find/count queries
 * 2. Converts `delete` operations to soft delete (UPDATE isDeleted = true)
 *
 * Uses Prisma Client Extensions (v5+) instead of deprecated middleware API.
 */

// Tables that support soft delete
const SOFT_DELETE_MODELS = new Set([
    'User',
    'Product',
    'ProductVariant',
    'Order',
    'OrderItem',
    'Campaign',
    'ProductCategory',
    'ProductBrand',
    'ProductColor',
    'SizeSet',
]);

/**
 * Returns a function that wraps Prisma queries for soft delete behavior.
 * Applied via $use in PrismaService constructor.
 */
export function softDeleteMiddleware() {
    return async (
        params: { model?: string; action: string; args: any },
        next: (params: any) => Promise<unknown>,
    ): Promise<unknown> => {
        if (!params.model || !SOFT_DELETE_MODELS.has(params.model)) {
            return next(params);
        }

        // ==========================================
        // AUTO-FILTER: Append isDeleted = false
        // ==========================================
        if (params.action === 'findUnique' || params.action === 'findFirst') {
            params.action = 'findFirst';
            params.args.where = {
                ...params.args.where,
                isDeleted: false,
            };
        }

        if (params.action === 'findMany') {
            if (!params.args) {
                params.args = {};
            }
            if (params.args.where) {
                if (params.args.where.isDeleted === undefined) {
                    params.args.where.isDeleted = false;
                }
            } else {
                params.args.where = { isDeleted: false };
            }
        }

        if (params.action === 'count') {
            if (!params.args) {
                params.args = {};
            }
            if (params.args.where) {
                if (params.args.where.isDeleted === undefined) {
                    params.args.where.isDeleted = false;
                }
            } else {
                params.args.where = { isDeleted: false };
            }
        }

        // ==========================================
        // SOFT DELETE: Convert delete to update
        // ==========================================
        if (params.action === 'delete') {
            params.action = 'update';
            params.args.data = {
                isDeleted: true,
                deletedAt: new Date(),
            };
        }

        if (params.action === 'deleteMany') {
            params.action = 'updateMany';
            if (params.args.data) {
                params.args.data.isDeleted = true;
                params.args.data.deletedAt = new Date();
            } else {
                params.args.data = {
                    isDeleted: true,
                    deletedAt: new Date(),
                };
            }
        }

        return next(params);
    };
}
