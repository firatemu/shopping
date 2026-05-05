import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportingService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Daily sales summary.
     */
    async getDailySales(tenantId: string, date: string) {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const orders = await this.prisma.order.findMany({
            where: { tenantId, isDeleted: false, createdAt: { gte: dayStart, lt: dayEnd } },
            include: { payments: true, _count: { select: { items: true } } },
        });

        const totalSales = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'PARTIALLY_RETURNED');
        const totalReturns = orders.filter((o) => o.status === 'FULLY_RETURNED');

        const revenue = totalSales.reduce((sum, o) => sum.add(o.grandTotal), new Decimal(0));
        const returnAmount = totalReturns.reduce((sum, o) => sum.add(o.grandTotal), new Decimal(0));
        const net = revenue.sub(returnAmount);

        const paymentBreakdown: Record<string, Decimal> = {};
        for (const order of totalSales) {
            for (const payment of order.payments) {
                const key = payment.type;
                paymentBreakdown[key] = (paymentBreakdown[key] ?? new Decimal(0)).add(payment.amount);
            }
        }

        return {
            date,
            totalOrders: totalSales.length,
            totalReturns: totalReturns.length,
            revenue: revenue.toString(),
            returnAmount: returnAmount.toString(),
            netRevenue: net.toString(),
            totalItems: totalSales.reduce((sum, o) => sum + o._count.items, 0),
            paymentBreakdown: Object.fromEntries(
                Object.entries(paymentBreakdown).map(([k, v]) => [k, v.toString()]),
            ),
        };
    }

    /**
     * Top selling products.
     */
    async getTopProducts(tenantId: string, options: { dateFrom?: string; dateTo?: string; limit?: number }) {
        const limit = options.limit ?? 20;
        const where: any = { tenantId };
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
            if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
        }

        const orderItems = await this.prisma.orderItem.findMany({
            where,
            include: { variant: { include: { product: true } } },
        });

        const productMap = new Map<string, { name: string; brand: string | null; totalQty: number; totalRevenue: Decimal }>();
        for (const item of orderItems) {
            const pid = item.variant.productId;
            const existing = productMap.get(pid);
            if (existing) {
                existing.totalQty += item.quantity;
                existing.totalRevenue = existing.totalRevenue.add(item.lineTotal);
            } else {
                productMap.set(pid, {
                    name: item.variant.product.name,
                    brand: item.variant.product.brand,
                    totalQty: item.quantity,
                    totalRevenue: item.lineTotal,
                });
            }
        }

        const sorted = Array.from(productMap.entries())
            .sort((a, b) => b[1].totalQty - a[1].totalQty)
            .slice(0, limit);

        return sorted.map(([id, data]) => ({
            productId: id,
            name: data.name,
            brand: data.brand,
            totalQuantity: data.totalQty,
            totalRevenue: data.totalRevenue.toString(),
        }));
    }

    /**
     * Dead stock report (products not sold in N days).
     */
    async getDeadStock(tenantId: string, daysSinceLastSale: number = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastSale);

        const variants = await this.prisma.productVariant.findMany({
            where: { tenantId, isDeleted: false, stockQuantity: { gt: 0 } },
            include: { product: true },
        });

        const recentSales = await this.prisma.orderItem.findMany({
            where: { tenantId, createdAt: { gte: cutoffDate } },
            select: { variantId: true },
        });
        const recentlySoldIds = new Set(recentSales.map((s) => s.variantId));

        const deadStock = variants.filter((v) => !recentlySoldIds.has(v.id));

        return {
            totalDeadItems: deadStock.length,
            totalDeadValue: deadStock.reduce((sum, v) => {
                const cost = v.costPrice ?? v.product.costPrice;
                return sum.add(cost.mul(v.stockQuantity));
            }, new Decimal(0)).toString(),
            items: deadStock.map((v) => ({
                variantId: v.id,
                barcode: v.barcode,
                productName: v.product.name,
                color: v.color,
                size: v.size,
                stockQuantity: v.stockQuantity,
                costValue: (v.costPrice ?? v.product.costPrice).mul(v.stockQuantity).toString(),
            })),
        };
    }

    /**
     * General dashboard KPIs.
     */
    async getDashboardKpis(tenantId: string) {
        const today = new Date();
        const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const [todayOrders, monthOrders, activeProducts, lowStockCount, totalCustomers, overdueCustomers] = await Promise.all([
            this.prisma.order.count({ where: { tenantId, isDeleted: false, createdAt: { gte: dayStart } } }),
            this.prisma.order.findMany({
                where: { tenantId, isDeleted: false, createdAt: { gte: monthStart } },
                select: { grandTotal: true },
            }),
            this.prisma.product.count({ where: { tenantId, isDeleted: false, isActive: true } }),
            this.prisma.productVariant.count({
                where: { tenantId, isDeleted: false, stockQuantity: { lte: 5 } },
            }),
            this.prisma.customer.count({ where: { tenantId, isDeleted: false } }),
            this.prisma.customer.count({ where: { tenantId, isDeleted: false, currentBalance: { gt: 0 } } }),
        ]);

        const monthlyRevenue = monthOrders.reduce((sum, o) => sum.add(o.grandTotal), new Decimal(0));

        return {
            todayOrders,
            monthlyRevenue: monthlyRevenue.toString(),
            activeProducts,
            lowStockAlerts: lowStockCount,
            totalCustomers,
            overdueCustomers,
        };
    }
}
