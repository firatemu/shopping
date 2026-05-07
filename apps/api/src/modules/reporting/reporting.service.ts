import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

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

    const totalSales = orders.filter(
      (o) => o.status === 'COMPLETED' || o.status === 'PARTIALLY_RETURNED',
    );
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
  async getTopProducts(
    tenantId: string,
    options: { dateFrom?: string; dateTo?: string; limit?: number },
  ) {
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

    const productMap = new Map<
      string,
      { name: string; brand: string | null; totalQty: number; totalRevenue: Decimal }
    >();
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
      totalDeadValue: deadStock
        .reduce((sum, v) => {
          const cost = v.costPrice ?? v.product.costPrice;
          return sum.add(cost.mul(v.stockQuantity));
        }, new Decimal(0))
        .toString(),
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

    const [
      todayOrders,
      monthOrders,
      activeProducts,
      lowStockCount,
      totalCustomers,
      overdueCustomers,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { tenantId, isDeleted: false, createdAt: { gte: dayStart } },
      }),
      this.prisma.order.findMany({
        where: { tenantId, isDeleted: false, createdAt: { gte: monthStart } },
        select: { grandTotal: true },
      }),
      this.prisma.product.count({ where: { tenantId, isDeleted: false, isActive: true } }),
      this.prisma.productVariant.count({
        where: { tenantId, isDeleted: false, stockQuantity: { lte: 5 } },
      }),
      this.prisma.customer.count({ where: { tenantId, isDeleted: false } }),
      this.prisma.customer.count({
        where: { tenantId, isDeleted: false, currentBalance: { gt: 0 } },
      }),
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

  /** Mobil dashboard: bugünün daily-sales + KPI özet. */
  async getMobileDailySummary(tenantId: string, date: string) {
    const [kpis, daily] = await Promise.all([
      this.getDashboardKpis(tenantId),
      this.getDailySales(tenantId, date),
    ]);
    const totalSales = daily.totalOrders;
    const revenueNum = new Decimal(daily.netRevenue ?? daily.revenue);
    const avgBasket = totalSales > 0 ? revenueNum.div(totalSales) : new Decimal(0);
    return {
      date,
      kpis,
      todaySales: daily,
      averageBasket: avgBasket.toString(),
      paymentBreakdown: daily.paymentBreakdown,
    };
  }

  /** Son N gün için günlük net ciro (tamamlanan siparişler). */
  async getSalesTrend(tenantId: string, days: number) {
    const d = Math.min(Math.max(days || 7, 1), 90);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - d + 1);
    start.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        isDeleted: false,
        createdAt: { gte: start, lte: end },
        status: {
          in: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_RETURNED, OrderStatus.FULLY_RETURNED],
        },
      },
      select: { createdAt: true, grandTotal: true, status: true },
    });

    const dayMap = new Map<string, { net: Decimal; sales: number; returns: number }>();
    const keyOf = (t: Date) => t.toISOString().slice(0, 10);

    for (let i = 0; i < d; i++) {
      const x = new Date(start);
      x.setDate(x.getDate() + i);
      dayMap.set(keyOf(x), { net: new Decimal(0), sales: 0, returns: 0 });
    }

    for (const o of orders) {
      const k = keyOf(o.createdAt);
      if (!dayMap.has(k)) continue;
      const row = dayMap.get(k)!;
      if (o.status === OrderStatus.FULLY_RETURNED) {
        row.returns += 1;
        row.net = row.net.sub(o.grandTotal);
      } else {
        row.sales += 1;
        row.net = row.net.add(o.grandTotal);
      }
    }

    return [...dayMap.entries()].map(([dateKey, v]) => ({
      date: dateKey,
      netRevenue: v.net.toString(),
      salesCount: v.sales,
      returnCount: v.returns,
    }));
  }

  async getSalesReport(
    tenantId: string,
    opts: {
      startDate: string;
      endDate: string;
      page?: number;
      limit?: number;
      paymentType?: PaymentType;
      soldBy?: string;
    },
  ) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const start = new Date(opts.startDate);
    const end = new Date(opts.endDate);
    end.setHours(23, 59, 59, 999);

    const where: Prisma.OrderWhereInput = {
      tenantId,
      isDeleted: false,
      createdAt: { gte: start, lte: end },
      status: {
        in: [OrderStatus.COMPLETED, OrderStatus.PARTIALLY_RETURNED, OrderStatus.FULLY_RETURNED],
      },
    };
    if (opts.soldBy) where.soldBy = opts.soldBy;
    if (opts.paymentType) {
      where.payments = { some: { type: opts.paymentType } };
    }

    const allForSummary = await this.prisma.order.findMany({
      where,
      select: { status: true, grandTotal: true },
    });
    let completedCount = 0;
    let returnCount = 0;
    let gross = new Decimal(0);
    let returnsGross = new Decimal(0);
    for (const o of allForSummary) {
      if (o.status === OrderStatus.FULLY_RETURNED) {
        returnCount += 1;
        returnsGross = returnsGross.add(o.grandTotal);
      } else {
        completedCount += 1;
        gross = gross.add(o.grandTotal);
      }
    }
    const netTotal = gross.sub(returnsGross);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          grandTotal: true,
          status: true,
          createdAt: true,
          customerId: true,
          soldBy: true,
          payments: { select: { type: true, amount: true, reference: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const customerIds = [...new Set(orders.map((o) => o.customerId).filter(Boolean))] as string[];
    const userIds = [...new Set(orders.map((o) => o.soldBy))];
    const [customers, users] = await Promise.all([
      customerIds.length
        ? this.prisma.customer.findMany({
            where: { tenantId, id: { in: customerIds } },
            select: { id: true, name: true, surname: true, companyName: true, phone: true },
          })
        : [],
      userIds.length
        ? this.prisma.user.findMany({
            where: { tenantId, id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [],
    ]);
    const cMap = new Map(customers.map((c) => [c.id, c]));
    const uMap = new Map(users.map((u) => [u.id, u]));

    return {
      summary: {
        completedCount,
        returnCount,
        grossTotal: gross.toString(),
        returnTotal: returnsGross.toString(),
        netTotal: netTotal.toString(),
      },
      data: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        grandTotal: o.grandTotal.toString(),
        status: o.status,
        createdAt: o.createdAt.toISOString(),
        customer: o.customerId ? (cMap.get(o.customerId) ?? null) : null,
        cashier: uMap.get(o.soldBy)
          ? `${uMap.get(o.soldBy)!.firstName} ${uMap.get(o.soldBy)!.lastName}`.trim()
          : null,
        soldBy: o.soldBy,
        payments: o.payments.map((p) => ({
          type: p.type,
          amount: p.amount.toString(),
          reference: p.reference,
        })),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStockOverviewReport(tenantId: string, filters: { category?: string; brand?: string }) {
    const productFilter: Prisma.ProductWhereInput = {};
    if (filters.category?.trim()) {
      productFilter.category = { equals: filters.category.trim(), mode: 'insensitive' };
    }
    if (filters.brand?.trim()) {
      productFilter.brand = { equals: filters.brand.trim(), mode: 'insensitive' };
    }

    const variants = await this.prisma.productVariant.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(Object.keys(productFilter).length ? { product: productFilter } : {}),
      },
      include: { product: true },
    });

    type CatAgg = { category: string; variantCount: number; totalQty: number; totalValue: Decimal };
    const byCat = new Map<string, CatAgg>();
    const lowStock: Array<{
      variantId: string;
      barcode: string;
      productName: string;
      color: string;
      size: string;
      stockQuantity: number;
      minStockLevel: number;
      costValue: string;
    }> = [];

    let totalValue = new Decimal(0);

    for (const v of variants) {
      const cat = v.product.category?.trim() || 'Diğer';
      const cost = v.costPrice ?? v.product.costPrice ?? new Decimal(0);
      const lineVal = cost.mul(v.stockQuantity);
      totalValue = totalValue.add(lineVal);

      if (!byCat.has(cat)) {
        byCat.set(cat, { category: cat, variantCount: 0, totalQty: 0, totalValue: new Decimal(0) });
      }
      const a = byCat.get(cat)!;
      a.variantCount += 1;
      a.totalQty += v.stockQuantity;
      a.totalValue = a.totalValue.add(lineVal);

      if (v.stockQuantity < v.minStockLevel) {
        lowStock.push({
          variantId: v.id,
          barcode: v.barcode,
          productName: v.product.name,
          color: v.color,
          size: v.size,
          stockQuantity: v.stockQuantity,
          minStockLevel: v.minStockLevel,
          costValue: lineVal.toString(),
        });
      }
    }

    return {
      totalStockValue: totalValue.toString(),
      byCategory: [...byCat.values()].map((x) => ({
        category: x.category,
        variantCount: x.variantCount,
        totalQuantity: x.totalQty,
        stockValue: x.totalValue.toString(),
      })),
      lowStock,
    };
  }

  async getCashRegisterSessionsReport(tenantId: string, dateFrom: string, dateTo: string) {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);

    const sessions = await this.prisma.cashRegisterSession.findMany({
      where: { tenantId, openedAt: { gte: start, lte: end } },
      orderBy: { openedAt: 'desc' },
      include: { adjustments: true },
    });

    let totalIn = new Decimal(0);
    let totalOut = new Decimal(0);
    for (const s of sessions) {
      for (const ad of s.adjustments) {
        if (ad.amount.gt(0)) totalIn = totalIn.add(ad.amount);
        else totalOut = totalOut.add(ad.amount.abs());
      }
    }

    return {
      period: { from: dateFrom, to: dateTo },
      cashFlow: {
        cashIn: totalIn.toString(),
        cashOut: totalOut.toString(),
        net: totalIn.sub(totalOut).toString(),
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        status: s.status,
        openedAt: s.openedAt.toISOString(),
        closedAt: s.closedAt?.toISOString() ?? null,
        openingBalance: s.openingBalance.toString(),
        closingBalance: s.closingBalance?.toString() ?? null,
        physicalCount: s.physicalCount?.toString() ?? null,
        difference: s.difference?.toString() ?? null,
        totalCash: s.totalCash.toString(),
        totalCard: s.totalCard.toString(),
        totalSales: s.totalSales,
        totalReturns: s.totalReturns,
        notes: s.notes,
        adjustments: s.adjustments.map((a) => ({
          amount: a.amount.toString(),
          reason: a.reason,
          createdAt: a.createdAt.toISOString(),
        })),
      })),
    };
  }
}
