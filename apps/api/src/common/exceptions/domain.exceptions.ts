import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when an optimistic lock conflict is detected.
 * Architecture Rule #4: product_variants and orders use version-based optimistic locking.
 */
export class OptimisticLockException extends HttpException {
    constructor(entity: string, id: string) {
        super(
            {
                statusCode: HttpStatus.CONFLICT,
                error: 'OptimisticLockConflict',
                message: `Concurrent modification detected on ${entity} (${id}). Please refresh and try again.`,
            },
            HttpStatus.CONFLICT,
        );
    }
}

/**
 * Thrown when a tenant boundary violation is detected.
 */
export class TenantAccessViolationException extends HttpException {
    constructor() {
        super(
            {
                statusCode: HttpStatus.FORBIDDEN,
                error: 'TenantAccessViolation',
                message: 'Access to this resource is not permitted.',
            },
            HttpStatus.FORBIDDEN,
        );
    }
}

/**
 * Thrown when stock is insufficient for an operation.
 */
export class InsufficientStockException extends HttpException {
    constructor(barcode: string, available: number, requested: number) {
        super(
            {
                statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                error: 'InsufficientStock',
                message: `Insufficient stock for ${barcode}: available=${available}, requested=${requested}`,
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }
}
