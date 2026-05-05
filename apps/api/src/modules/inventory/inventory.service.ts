import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InsufficientStockException, OptimisticLockException } from '../../common/exceptions/domain.exceptions';
import { BulkStockAdjustmentDto, StockReservationDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
    private readonly logger = new Logger(InventoryService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Recent stock movements across the tenant (for inventory dashboard).
     */
    async listRecentMovements(
        tenantId: string,
        options: { limit?: number; search?: string },
    ): Promise<{ data: Array<{
        id: string;
        type: string;
        quantity: number;
        productName: string;
        variantInfo: string;
        reference: string;
        createdAt: string;
    }>; meta: { total: number } }> {
        const limit = Math.min(options.limit ?? 30, 100);
        const search = options.search?.trim();

        const where: Prisma.StockMovementWhereInput = { tenantId };
        if (search) {
            where.OR = [
                { reason: { contains: search, mode: 'insensitive' } },
                { variant: { barcode: { contains: search, mode: 'insensitive' } } },
                { variant: { product: { name: { contains: search, mode: 'insensitive' } } } },
                { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
            ];
        }

        const [movements, total] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: {
                    variant: { include: { product: { select: { name: true } } } },
                    order: { select: { orderNumber: true } },
                },
            }),
            this.prisma.stockMovement.count({ where }),
        ]);

        const data = movements.map((m) => ({
            id: m.id,
            type: m.type,
            quantity: m.quantity,
            productName: m.variant.product.name,
            variantInfo: `${m.variant.color} / ${m.variant.size}`,
            reference: m.order?.orderNumber ?? m.reason ?? '—',
            createdAt: m.createdAt.toISOString(),
        }));

        return { data, meta: { total } };
    }

    /**
     * Get stock movements for a variant (immutable event log).
     */
    async getMovements(
        tenantId: string,
        variantId: string,
        options: { page?: number; limit?: number },
    ) {
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const [movements, total] = await Promise.all([
            this.prisma.stockMovement.findMany({
                where: { tenantId, variantId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.stockMovement.count({
                where: { tenantId, variantId },
            }),
        ]);

        return {
            data: movements,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    /**
     * Get current stock summary for all variants.
     */
    async getStockSummary(
        tenantId: string,
        options: {
            page?: number;
            limit?: number;
            lowStockOnly?: boolean;
            search?: string;
            category?: string;
            brand?: string;
        },
    ) {
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 50, 100);
        const skip = (page - 1) * limit;

        const search = options.search?.trim();
        const category = options.category?.trim();
        const brand = options.brand?.trim();

        const productFilter: Prisma.ProductWhereInput = {
            tenantId,
            isDeleted: false,
        };
        if (category) productFilter.category = category;
        if (brand) productFilter.brand = brand;

        const where: Prisma.ProductVariantWhereInput = {
            tenantId,
            isDeleted: false,
            product: { is: productFilter },
        };

        if (search) {
            where.OR = [
                { barcode: { contains: search, mode: 'insensitive' } },
                { product: { is: { ...productFilter, name: { contains: search, mode: 'insensitive' } } } },
            ];
        }

        if (options.lowStockOnly) {
            const countRows = await this.prisma.$queryRaw<[{ c: bigint }]>(
                Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM product_variants pv
          INNER JOIN products p ON p.id = pv.product_id
          WHERE pv.tenant_id = ${tenantId}::uuid
            AND pv.is_deleted = false
            AND p.is_deleted = false
            AND p.tenant_id = ${tenantId}::uuid
            AND pv.stock_quantity <= pv.min_stock_level
            ${category ? Prisma.sql`AND p.category = ${category}` : Prisma.empty}
            ${brand ? Prisma.sql`AND p.brand = ${brand}` : Prisma.empty}
            ${
                search
                    ? Prisma.sql`AND (
                pv.barcode ILIKE ${'%' + search + '%'}
                OR p.name ILIKE ${'%' + search + '%'}
              )`
                    : Prisma.empty
            }
        `,
            );
            const total = Number(countRows[0]?.c ?? 0);

            const idRows = await this.prisma.$queryRaw<Array<{ id: string }>>(
                Prisma.sql`
          SELECT pv.id
          FROM product_variants pv
          INNER JOIN products p ON p.id = pv.product_id
          WHERE pv.tenant_id = ${tenantId}::uuid
            AND pv.is_deleted = false
            AND p.is_deleted = false
            AND p.tenant_id = ${tenantId}::uuid
            AND pv.stock_quantity <= pv.min_stock_level
            ${category ? Prisma.sql`AND p.category = ${category}` : Prisma.empty}
            ${brand ? Prisma.sql`AND p.brand = ${brand}` : Prisma.empty}
            ${
                search
                    ? Prisma.sql`AND (
                pv.barcode ILIKE ${'%' + search + '%'}
                OR p.name ILIKE ${'%' + search + '%'}
              )`
                    : Prisma.empty
            }
          ORDER BY pv.stock_quantity ASC
          LIMIT ${limit} OFFSET ${skip}
        `,
            );
            const ids = idRows.map((r) => r.id);
            const variants =
                ids.length === 0
                    ? []
                    : await this.prisma.productVariant.findMany({
                          where: { id: { in: ids }, tenantId },
                          include: {
                              product: { select: { name: true, brand: true, category: true } },
                          },
                          orderBy: { stockQuantity: 'asc' },
                      });

            const data = variants.map((v) => ({
                id: v.id,
                barcode: v.barcode,
                productName: v.product.name,
                brand: v.product.brand,
                color: v.color,
                size: v.size,
                stockQuantity: v.stockQuantity,
                reservedQty: v.reservedQty,
                availableQty: v.stockQuantity - v.reservedQty,
                minStockLevel: v.minStockLevel,
                isLowStock: v.stockQuantity <= v.minStockLevel,
            }));

            return {
                data,
                meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
            };
        }

        const [variants, total] = await Promise.all([
            this.prisma.productVariant.findMany({
                where,
                include: {
                    product: { select: { name: true, brand: true, category: true } },
                },
                orderBy: { stockQuantity: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.productVariant.count({ where }),
        ]);

        const data = variants.map((v) => ({
            id: v.id,
            barcode: v.barcode,
            productName: v.product.name,
            brand: v.product.brand,
            color: v.color,
            size: v.size,
            stockQuantity: v.stockQuantity,
            reservedQty: v.reservedQty,
            availableQty: v.stockQuantity - v.reservedQty,
            minStockLevel: v.minStockLevel,
            isLowStock: v.stockQuantity <= v.minStockLevel,
        }));

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
        };
    }

    /**
     * Bulk stock adjustment — max 500 items per request.
     * Each adjustment creates an immutable stock_movement record.
     */
    async bulkAdjust(tenantId: string, dto: BulkStockAdjustmentDto, userId: string) {
        return this.prisma.executeTransaction(async (tx) => {
            const results: Array<{
                variantId: string;
                barcode: string;
                previousQty: number;
                newQty: number;
                difference: number;
            }> = [];

            for (const item of dto.items) {
                const variant = await tx.productVariant.findFirst({
                    where: { id: item.variantId, tenantId, isDeleted: false },
                });

                if (!variant) {
                    throw new NotFoundException(`Varyant bulunamadı: ${item.variantId}`);
                }

                const difference = item.newQuantity - variant.stockQuantity;

                // Update stock with optimistic locking (Rule #4)
                const updated = await tx.productVariant.updateMany({
                    where: {
                        id: item.variantId,
                        version: variant.version,
                    },
                    data: {
                        stockQuantity: item.newQuantity,
                        version: { increment: 1 },
                    },
                });

                if (updated.count === 0) {
                    throw new OptimisticLockException('ProductVariant', item.variantId);
                }

                // Create immutable stock movement record
                await tx.stockMovement.create({
                    data: {
                        tenantId,
                        variantId: item.variantId,
                        type: StockMovementType.ADJUSTMENT,
                        quantity: difference,
                        previousQty: variant.stockQuantity,
                        newQty: item.newQuantity,
                        reason: item.reason ?? dto.reason.toString(),
                        createdBy: userId,
                    },
                });

                results.push({
                    variantId: item.variantId,
                    barcode: variant.barcode,
                    previousQty: variant.stockQuantity,
                    newQty: item.newQuantity,
                    difference,
                });
            }

            // Audit log
            await tx.auditLog.create({
                data: {
                    tenantId,
                    userId,
                    entityType: 'StockAdjustment',
                    entityId: 'bulk',
                    action: 'CREATE',
                    newValue: { reason: dto.reason, itemCount: results.length, results } as any,
                },
            });

            this.logger.log(
                `[tenantId=${tenantId}] Bulk stock adjustment: ${results.length} items by userId=${userId}`,
            );

            return { adjustedCount: results.length, results };
        });
    }

    /**
     * Reserve stock for a cart item (time-limited TTL).
     */
    async reserveStock(tenantId: string, dto: StockReservationDto, userId: string) {
        return this.prisma.executeTransaction(async (tx) => {
            const variant = await tx.productVariant.findFirst({
                where: { id: dto.variantId, tenantId, isDeleted: false },
            });

            if (!variant) {
                throw new NotFoundException('Varyant bulunamadı');
            }

            const availableQty = variant.stockQuantity - variant.reservedQty;
            if (availableQty < dto.quantity) {
                throw new InsufficientStockException(
                    variant.barcode,
                    availableQty,
                    dto.quantity,
                );
            }

            // Reserve with optimistic locking
            const updated = await tx.productVariant.updateMany({
                where: {
                    id: dto.variantId,
                    version: variant.version,
                },
                data: {
                    reservedQty: { increment: dto.quantity },
                    version: { increment: 1 },
                },
            });

            if (updated.count === 0) {
                throw new OptimisticLockException('ProductVariant', dto.variantId);
            }

            // Create reservation movement
            await tx.stockMovement.create({
                data: {
                    tenantId,
                    variantId: dto.variantId,
                    type: StockMovementType.RESERVATION,
                    quantity: -dto.quantity,
                    previousQty: variant.stockQuantity,
                    newQty: variant.stockQuantity,
                    reason: `Reserved ${dto.quantity} units`,
                    createdBy: userId,
                },
            });

            return {
                variantId: dto.variantId,
                reservedQuantity: dto.quantity,
                availableAfter: availableQty - dto.quantity,
                ttlSeconds: dto.ttlSeconds ?? 900,
            };
        });
    }

    /**
     * Release previously reserved stock.
     */
    async releaseStock(tenantId: string, variantId: string, quantity: number, userId: string) {
        return this.prisma.executeTransaction(async (tx) => {
            const variant = await tx.productVariant.findFirst({
                where: { id: variantId, tenantId, isDeleted: false },
            });

            if (!variant) {
                throw new NotFoundException('Varyant bulunamadı');
            }

            if (variant.reservedQty < quantity) {
                throw new BadRequestException(
                    `Serbest bırakılacak miktar (${quantity}) rezerve edilen miktardan (${variant.reservedQty}) büyük olamaz`,
                );
            }

            const updated = await tx.productVariant.updateMany({
                where: { id: variantId, version: variant.version },
                data: {
                    reservedQty: { decrement: quantity },
                    version: { increment: 1 },
                },
            });

            if (updated.count === 0) {
                throw new OptimisticLockException('ProductVariant', variantId);
            }

            await tx.stockMovement.create({
                data: {
                    tenantId,
                    variantId,
                    type: StockMovementType.RELEASE,
                    quantity,
                    previousQty: variant.stockQuantity,
                    newQty: variant.stockQuantity,
                    reason: `Released ${quantity} units`,
                    createdBy: userId,
                },
            });

            return {
                variantId,
                releasedQuantity: quantity,
                remainingReserved: variant.reservedQty - quantity,
            };
        });
    }

    /**
     * Get low-stock alerts for the tenant.
     */
    async getLowStockAlerts(tenantId: string) {
        const variants = await this.prisma.productVariant.findMany({
            where: {
                tenantId,
                isDeleted: false,
            },
            include: {
                product: { select: { name: true, brand: true } },
            },
        });

        const lowStockItems = variants.filter(
            (v) => v.stockQuantity <= v.minStockLevel,
        );

        return {
            totalAlerts: lowStockItems.length,
            items: lowStockItems.map((v) => ({
                variantId: v.id,
                barcode: v.barcode,
                productName: v.product.name,
                brand: v.product.brand,
                color: v.color,
                size: v.size,
                currentStock: v.stockQuantity,
                minLevel: v.minStockLevel,
                deficit: v.minStockLevel - v.stockQuantity,
            })),
        };
    }
}
