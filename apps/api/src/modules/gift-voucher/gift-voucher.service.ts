import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, GiftVoucherStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCorporateGiftVoucherDto } from './dto/gift-voucher.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentItemDto } from '../sales/dto/sales.dto';

@Injectable()
export class GiftVoucherService {
    constructor(private readonly prisma: PrismaService) { }

    normalizeCode(raw: string): string {
        return raw.replace(/\s+/g, '').toUpperCase();
    }

    async pickUniqueCode(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
        for (let i = 0; i < 32; i++) {
            const code = `HV${randomBytes(4).toString('hex').toUpperCase()}`;
            const exists = await tx.giftVoucher.findFirst({
                where: { tenantId, code },
            });
            if (!exists) return code;
        }
        throw new BadRequestException('Benzersiz hediye çeki numarası üretilemedi');
    }

    assertRedeemable(
        row: {
            status: GiftVoucherStatus;
            currentBalance: Decimal;
            expiresAt: Date | null;
        },
        codeLabel: string,
    ): void {
        if (row.status === 'BLACKLISTED') {
            throw new BadRequestException(`Hediye çeki kullanıma kapalı: ${codeLabel}`);
        }
        if (row.status === 'FULLY_USED' || row.status === 'EXPIRED') {
            throw new BadRequestException(`Hediye çeki kullanılamaz (${row.status}): ${codeLabel}`);
        }
        if (row.status !== 'ACTIVE' && row.status !== 'PARTIALLY_USED') {
            throw new BadRequestException(`Hediye çeki kullanılamaz: ${codeLabel}`);
        }
        if (row.expiresAt && row.expiresAt < new Date()) {
            throw new BadRequestException(`Hediye çekinin süresi dolmuş: ${codeLabel}`);
        }
        if (row.currentBalance.lte(0)) {
            throw new BadRequestException(`Hediye çekinin bakiyesi yetersiz: ${codeLabel}`);
        }
    }

    aggregateVoucherUsage(payments: PaymentItemDto[]): Map<string, Decimal> {
        const usage = new Map<string, Decimal>();
        for (const p of payments) {
            if (p.type !== 'GIFT_VOUCHER') continue;
            const code = this.normalizeCode(p.reference ?? '');
            if (!code) {
                throw new BadRequestException('Hediye çeki ödemesi için çek numarası (reference) zorunludur');
            }
            const amt = new Decimal(p.amount);
            if (amt.lte(0)) {
                throw new BadRequestException('Hediye çeki ödeme tutarı sıfırdan büyük olmalıdır');
            }
            usage.set(code, (usage.get(code) ?? new Decimal(0)).add(amt));
        }
        return usage;
    }

    async createCorporate(tenantId: string, dto: CreateCorporateGiftVoucherDto, userId: string) {
        return this.prisma.executeTransaction(async (tx) => {
            const amount = new Decimal(dto.amount);
            const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;

            let code: string;
            const requested = dto.code?.trim();
            if (requested) {
                code = this.normalizeCode(requested);
                if (code.length < 4) throw new BadRequestException('Çek kodu en az 4 karakter olmalıdır');
                const taken = await tx.giftVoucher.findFirst({ where: { tenantId, code } });
                if (taken) throw new BadRequestException('Bu kod zaten kullanılıyor');
            } else {
                code = await this.pickUniqueCode(tx, tenantId);
            }

            return tx.giftVoucher.create({
                data: {
                    tenantId,
                    code,
                    source: 'CORPORATE',
                    companyName: dto.companyName ?? null,
                    notes: dto.notes ?? null,
                    initialBalance: amount,
                    currentBalance: amount,
                    status: 'ACTIVE',
                    expiresAt: expiresAt ?? null,
                    createdBy: userId,
                },
            });
        });
    }

    async list(
        tenantId: string,
        options: {
            page?: number;
            limit?: number;
            search?: string;
            status?: 'ACTIVE' | 'USED' | 'EXPIRED' | 'ALL';
        },
    ) {
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const andClauses: Prisma.GiftVoucherWhereInput[] = [{ tenantId }];
        const q = options.search?.trim();
        if (q) {
            andClauses.push({
                OR: [
                    { code: { contains: q, mode: 'insensitive' } },
                    { companyName: { contains: q, mode: 'insensitive' } },
                ],
            });
        }
        const st = options.status ?? 'ALL';
        if (st === 'ACTIVE') {
            andClauses.push({ status: { in: [GiftVoucherStatus.ACTIVE, GiftVoucherStatus.PARTIALLY_USED] } });
            andClauses.push({
                OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
            });
        } else if (st === 'USED') {
            andClauses.push({ status: GiftVoucherStatus.FULLY_USED });
        } else if (st === 'EXPIRED') {
            andClauses.push({
                OR: [
                    { status: GiftVoucherStatus.EXPIRED },
                    {
                        expiresAt: { lt: new Date() },
                        status: {
                            notIn: [GiftVoucherStatus.FULLY_USED, GiftVoucherStatus.BLACKLISTED],
                        },
                    },
                ],
            });
        }

        const where: Prisma.GiftVoucherWhereInput = { AND: andClauses };

        const [data, total] = await Promise.all([
            this.prisma.giftVoucher.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    sourceOrder: { select: { id: true, orderNumber: true } },
                },
            }),
            this.prisma.giftVoucher.count({ where }),
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(tenantId: string, id: string) {
        const row = await this.prisma.giftVoucher.findFirst({
            where: { id, tenantId },
            include: { sourceOrder: { select: { id: true, orderNumber: true } } },
        });
        if (!row) throw new NotFoundException('Hediye çeki bulunamadı');

        const redemptions = await this.prisma.payment.findMany({
            where: { tenantId, giftVoucherId: id, type: 'GIFT_VOUCHER' },
            orderBy: { createdAt: 'desc' },
            include: {
                order: { select: { id: true, orderNumber: true, createdAt: true, grandTotal: true } },
            },
        });

        const expiredByDate = !!(row.expiresAt && row.expiresAt < new Date());
        const effectiveStatus =
            expiredByDate && row.status !== 'FULLY_USED' && row.status !== 'BLACKLISTED'
                ? 'EXPIRED'
                : row.status;

        return {
            id: row.id,
            tenantId: row.tenantId,
            code: row.code,
            source: row.source,
            companyName: row.companyName,
            notes: row.notes,
            sourceOrderId: row.sourceOrderId,
            sourceOrder: row.sourceOrder,
            initialBalance: row.initialBalance.toString(),
            currentBalance: row.currentBalance.toString(),
            status: row.status,
            effectiveStatus,
            expiresAt: row.expiresAt,
            createdBy: row.createdBy,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            redemptions: redemptions.map((p) => ({
                paymentId: p.id,
                amount: p.amount.toString(),
                createdAt: p.createdAt.toISOString(),
                orderId: p.orderId,
                orderNumber: p.order?.orderNumber,
            })),
        };
    }

    async lookup(tenantId: string, rawCode: string) {
        const code = this.normalizeCode(rawCode);
        if (!code) throw new BadRequestException('Çek numarası girin');

        const row = await this.prisma.giftVoucher.findFirst({
            where: { tenantId, code },
        });
        if (!row) throw new NotFoundException('Hediye çeki bulunamadı');

        const expiredByDate = !!(row.expiresAt && row.expiresAt < new Date());
        const effectiveStatus =
            expiredByDate && row.status !== 'FULLY_USED' && row.status !== 'BLACKLISTED'
                ? 'EXPIRED'
                : row.status;

        return {
            id: row.id,
            code: row.code,
            status: effectiveStatus,
            initialBalance: row.initialBalance.toString(),
            currentBalance: row.currentBalance.toString(),
            source: row.source,
            companyName: row.companyName,
            expiresAt: row.expiresAt,
            sourceOrderId: row.sourceOrderId,
        };
    }

    async issueFromReturnTx(
        tx: Prisma.TransactionClient,
        tenantId: string,
        userId: string,
        sourceOrderId: string,
        amount: Decimal,
    ) {
        if (amount.lte(0)) {
            throw new BadRequestException('İade tutarı sıfırdan büyük olmalıdır');
        }
        const code = await this.pickUniqueCode(tx, tenantId);
        return tx.giftVoucher.create({
            data: {
                tenantId,
                code,
                source: 'RETURN_REFUND',
                sourceOrderId,
                initialBalance: amount,
                currentBalance: amount,
                status: 'ACTIVE',
                createdBy: userId,
            },
        });
    }
}
