import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  InsufficientStockException,
  OptimisticLockException,
} from '../../common/exceptions/domain.exceptions';
import { CreateOrderDto, CreateReturnDto } from './dto/sales.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { GiftVoucherService } from '../gift-voucher/gift-voucher.service';
import { GiftVoucher } from '@prisma/client';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly giftVoucherService: GiftVoucherService,
  ) {}

  private money2(d: Decimal): Decimal {
    return new Decimal(d.toDecimalPlaces(2).toString());
  }

  /**
   * Complete checkout — atomic transaction (Architecture Rule #2).
   * BEGIN → INSERT order → UPDATE stock → INSERT stock_movements → INSERT payments → COMMIT
   */
  async checkout(tenantId: string, dto: CreateOrderDto, userId: string) {
    return this.prisma.executeTransaction(async (tx) => {
      // 1. Generate order number: [YYYYMMDD]-[TenantCode]-[DailySeq(5)]
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) throw new NotFoundException('Tenant bulunamadı');

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const dailyCount = await tx.order.count({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          },
        },
      });
      const orderNumber = `${dateStr}-${tenant.code}-${String(dailyCount + 1).padStart(5, '0')}`;

      const n = dto.items.length;
      const cartDiscRaw = new Decimal(dto.cartDiscountAmount ?? 0);
      if (cartDiscRaw.lt(0)) {
        throw new BadRequestException('Sepet indirimi negatif olamaz');
      }
      const cartCents = Math.round(Number(cartDiscRaw.toFixed(2)) * 100);
      const baseCartShare = n > 0 ? Math.floor(cartCents / n) : 0;
      const cartRemainderExtraCent = n > 0 ? cartCents - baseCartShare * n : 0;

      // 2. Resolve cart items, stock, indirimler (KDV indirim sonrası matrahtan)
      let subtotal = new Decimal(0);
      let discountTotal = new Decimal(0);
      let kdvTotal = new Decimal(0);

      const resolvedItems: Array<{
        variant: any;
        product: any;
        quantity: number;
        unitPrice: Decimal;
        kdvRate: Decimal;
        lineGross: Decimal;
        discountAmount: Decimal;
        kdvAmount: Decimal;
        lineTotal: Decimal;
      }> = [];

      for (let idx = 0; idx < dto.items.length; idx++) {
        const item = dto.items[idx];
        const pct = item.lineDiscountPercent ?? 0;
        const fixedLine = item.lineDiscountAmount ?? 0;
        if (pct > 0 && fixedLine > 0) {
          throw new BadRequestException(
            `Satır indirimi hem yüzde hem tutar olamaz: ${item.barcode}`,
          );
        }

        const variant = await tx.productVariant.findFirst({
          where: { tenantId, barcode: item.barcode, isDeleted: false },
          include: { product: true },
        });

        if (!variant) {
          throw new NotFoundException(`Barkod bulunamadı: ${item.barcode}`);
        }

        const availableQty = variant.stockQuantity - variant.reservedQty;
        if (availableQty < item.quantity) {
          throw new InsufficientStockException(item.barcode, availableQty, item.quantity);
        }

        const unitPrice = new Decimal((variant.salePrice ?? variant.product.salePrice).toString());
        const kdvRate = new Decimal(variant.product.kdvRate.toString());
        const lineGross = this.money2(unitPrice.mul(item.quantity));
        const grossCents = Math.round(Number(lineGross) * 100);

        let lineDiscCents = 0;
        if (pct > 0) {
          lineDiscCents = Math.min(grossCents, Math.floor((grossCents * pct) / 100));
        } else if (fixedLine > 0) {
          lineDiscCents = Math.min(grossCents, Math.round(fixedLine * 100));
        }

        const cartShareCents = baseCartShare + (idx < cartRemainderExtraCent ? 1 : 0);
        const totalDiscCents = lineDiscCents + cartShareCents;
        if (totalDiscCents > grossCents) {
          throw new BadRequestException(
            `İndirim satır tutarını aşıyor (${item.barcode}). Sepet veya satır indirimini azaltın.`,
          );
        }

        const netBeforeKdv = new Decimal(grossCents - totalDiscCents).div(100);
        const kdvAmount = this.money2(netBeforeKdv.mul(kdvRate).div(100));
        const lineTotal = this.money2(netBeforeKdv.add(kdvAmount));
        const discountAmount = new Decimal(totalDiscCents).div(100);

        subtotal = subtotal.add(lineGross);
        discountTotal = discountTotal.add(discountAmount);
        kdvTotal = kdvTotal.add(kdvAmount);

        resolvedItems.push({
          variant,
          product: variant.product,
          quantity: item.quantity,
          unitPrice,
          kdvRate,
          lineGross,
          discountAmount,
          kdvAmount,
          lineTotal,
        });
      }

      const grandTotal = this.money2(
        resolvedItems.reduce((s, r) => s.add(r.lineTotal), new Decimal(0)),
      );

      // 3. Validate payment amounts match grand total
      const totalPayment = dto.payments.reduce(
        (sum, p) => sum.add(new Decimal(p.amount)),
        new Decimal(0),
      );

      const centsDiff = totalPayment.mul(100).sub(grandTotal.mul(100)).abs();
      if (centsDiff.gt(new Decimal('1'))) {
        throw new BadRequestException(
          `Ödeme tutarı (${totalPayment}) sipariş toplamı (${grandTotal}) ile eşleşmiyor`,
        );
      }

      const voucherUsage = this.giftVoucherService.aggregateVoucherUsage(dto.payments);
      const voucherRowsByCode = new Map<
        string,
        {
          id: string;
          code: string;
          currentBalance: Decimal;
          status: GiftVoucher['status'];
          expiresAt: Date | null;
        }
      >();

      for (const [code, useAmt] of voucherUsage) {
        const row = await tx.giftVoucher.findFirst({
          where: { tenantId, code },
        });
        if (!row) throw new NotFoundException(`Hediye çeki bulunamadı: ${code}`);
        this.giftVoucherService.assertRedeemable(row, code);
        if (row.currentBalance.lt(useAmt)) {
          throw new BadRequestException(
            `Hediye çeki bakiyesi yetersiz (${code}): mevcut ${row.currentBalance}, kullanım ${useAmt}`,
          );
        }
        voucherRowsByCode.set(code, row);
      }

      // 4. Create order
      const order = await tx.order.create({
        data: {
          tenantId,
          orderNumber,
          customerId: dto.customerId,
          status: 'COMPLETED',
          subtotal,
          discountTotal,
          kdvTotal,
          grandTotal,
          notes: dto.notes,
          soldBy: userId,
        },
      });

      // 5. Create order items + update stock + create movements
      for (const item of resolvedItems) {
        await tx.orderItem.create({
          data: {
            tenantId,
            orderId: order.id,
            variantId: item.variant.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            kdvRate: item.kdvRate,
            kdvAmount: item.kdvAmount,
            lineTotal: item.lineTotal,
          },
        });

        // Update stock with optimistic locking (Rule #4)
        const updated = await tx.productVariant.updateMany({
          where: { id: item.variant.id, version: item.variant.version },
          data: {
            stockQuantity: { decrement: item.quantity },
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw new OptimisticLockException('ProductVariant', item.variant.id);
        }

        // Create immutable stock movement
        await tx.stockMovement.create({
          data: {
            tenantId,
            variantId: item.variant.id,
            type: 'SALE',
            quantity: -item.quantity,
            previousQty: item.variant.stockQuantity,
            newQty: item.variant.stockQuantity - item.quantity,
            orderId: order.id,
            reason: `Sale: Order ${orderNumber}`,
            createdBy: userId,
          },
        });
      }

      // 6. Create payments + redeem gift vouchers
      for (const payment of dto.payments) {
        let giftVoucherId: string | undefined;
        if (payment.type === 'GIFT_VOUCHER') {
          const code = this.giftVoucherService.normalizeCode(payment.reference ?? '');
          giftVoucherId = voucherRowsByCode.get(code)!.id;
        }
        await tx.payment.create({
          data: {
            tenantId,
            orderId: order.id,
            type: payment.type,
            amount: payment.amount,
            reference: payment.reference,
            giftVoucherId,
          },
        });
      }

      for (const [code, useAmt] of voucherUsage) {
        const row = voucherRowsByCode.get(code)!;
        const newBal = row.currentBalance.sub(useAmt);
        const newStatus = newBal.eq(0) ? ('FULLY_USED' as const) : ('PARTIALLY_USED' as const);
        await tx.giftVoucher.update({
          where: { id: row.id },
          data: { currentBalance: newBal, status: newStatus },
        });
      }

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'Order',
          entityId: order.id,
          action: 'CREATE',
          newValue: {
            orderNumber,
            grandTotal: grandTotal.toString(),
            itemCount: resolvedItems.length,
          } as any,
        },
      });

      this.logger.log(
        `[tenantId=${tenantId}] Order completed: ${orderNumber} — total: ${grandTotal} — userId: ${userId}`,
      );

      return this.getOrderById(tenantId, order.id);
    });
  }

  /**
   * Process a return (partial or full).
   */
  async processReturn(tenantId: string, dto: CreateReturnDto, userId: string) {
    return this.prisma.executeTransaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: dto.orderId, tenantId },
        include: { items: true },
      });

      if (!order) throw new NotFoundException('Sipariş bulunamadı');
      if (order.status === 'FULLY_RETURNED') {
        throw new BadRequestException('Bu sipariş zaten tam iade edilmiş');
      }

      let totalRefund = new Decimal(0);

      for (const returnItem of dto.items) {
        const orderItem = order.items.find((i) => i.id === returnItem.orderItemId);
        if (!orderItem) {
          throw new NotFoundException(`Sipariş kalemi bulunamadı: ${returnItem.orderItemId}`);
        }

        const returnableQty = orderItem.quantity - orderItem.returnedQty;
        if (returnItem.quantity > returnableQty) {
          throw new BadRequestException(
            `İade edilebilir miktar: ${returnableQty}, istenen: ${returnItem.quantity}`,
          );
        }

        // Update order item returned qty
        await tx.orderItem.update({
          where: { id: returnItem.orderItemId },
          data: { returnedQty: { increment: returnItem.quantity } },
        });

        // Restore stock with optimistic locking
        const variant = await tx.productVariant.findFirst({
          where: { id: orderItem.variantId, tenantId },
        });

        if (variant) {
          const updated = await tx.productVariant.updateMany({
            where: { id: variant.id, version: variant.version },
            data: {
              stockQuantity: { increment: returnItem.quantity },
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) {
            throw new OptimisticLockException('ProductVariant', variant.id);
          }

          await tx.stockMovement.create({
            data: {
              tenantId,
              variantId: variant.id,
              type: 'RETURN',
              quantity: returnItem.quantity,
              previousQty: variant.stockQuantity,
              newQty: variant.stockQuantity + returnItem.quantity,
              orderId: order.id,
              reason: returnItem.reason ?? 'Return',
              createdBy: userId,
            },
          });
        }

        const refundPerUnit = orderItem.lineTotal.div(orderItem.quantity);
        totalRefund = totalRefund.add(refundPerUnit.mul(returnItem.quantity));
      }

      // Update order status
      const allItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
      });
      const fullyReturned = allItems.every((i) => i.returnedQty >= i.quantity);

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: fullyReturned ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED',
        },
      });

      let issuedVoucher: GiftVoucher | null = null;
      if (dto.issueGiftVoucher) {
        if (totalRefund.lte(0)) {
          throw new BadRequestException('Hediye çeki oluşturmak için pozitif iade tutarı gerekir');
        }
        issuedVoucher = await this.giftVoucherService.issueFromReturnTx(
          tx,
          tenantId,
          userId,
          order.id,
          totalRefund,
        );
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'Order',
          entityId: order.id,
          action: 'UPDATE',
          newValue: {
            action: 'RETURN',
            refundAmount: totalRefund.toString(),
            giftVoucherCode: issuedVoucher?.code,
          } as any,
        },
      });

      this.logger.log(
        `[tenantId=${tenantId}] Return processed: order=${order.orderNumber} refund=${totalRefund}`,
      );

      return {
        orderId: order.id,
        refundAmount: totalRefund,
        status: fullyReturned ? 'FULLY_RETURNED' : 'PARTIALLY_RETURNED',
        giftVoucher: issuedVoucher
          ? {
              id: issuedVoucher.id,
              code: issuedVoucher.code,
              initialBalance: issuedVoucher.initialBalance.toString(),
              currentBalance: issuedVoucher.currentBalance.toString(),
            }
          : undefined,
      };
    });
  }

  /**
   * Get order by ID with items and payments.
   */
  async getOrderById(tenantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        payments: true,
      },
    });

    if (!order) throw new NotFoundException('Sipariş bulunamadı');
    return order;
  }

  /**
   * List orders with pagination.
   */
  async listOrders(
    tenantId: string,
    options: { page?: number; limit?: number; status?: string; dateFrom?: string; dateTo?: string },
  ) {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId, isDeleted: false };
    if (options.status) where.status = options.status;
    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
      if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { payments: true, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
