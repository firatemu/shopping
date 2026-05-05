import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto, CreatePaymentDto, CustomerTypeEnum } from './dto/customer.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class CustomerService {
    private readonly logger = new Logger(CustomerService.name);

    constructor(private readonly prisma: PrismaService) { }

    private async generateCustomerCode(tx: any, tenantId: string): Promise<string> {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { code: true } });
        const prefix = tenant?.code ?? 'UNK';
        const count = await tx.customer.count({ where: { tenantId } });
        return `${prefix}-C${String(count + 1).padStart(6, '0')}`;
    }

    async create(tenantId: string, dto: CreateCustomerDto, userId: string) {
        const customer = await this.prisma.executeTransaction(async (tx) => {
            const code = dto.code?.trim() ? dto.code.trim() : await this.generateCustomerCode(tx, tenantId);
            const openingBalance = dto.openingBalance !== undefined ? new Decimal(dto.openingBalance) : new Decimal(0);

            const created = await tx.customer.create({
                data: {
                    tenantId,
                    code,
                    type: (dto.type ?? CustomerTypeEnum.CUSTOMER) as any,
                    name: dto.name,
                    surname: dto.surname,
                    companyName: dto.companyName,
                    taxId: dto.taxId,
                    taxOffice: dto.taxOffice,
                    phone: dto.phone,
                    email: dto.email,
                    country: dto.country ?? 'Türkiye',
                    address: dto.address,
                    city: dto.city,
                    district: dto.district,
                    neighborhood: dto.neighborhood,
                    postalCode: dto.postalCode,
                    birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
                    creditLimit: dto.creditLimit ?? 0,
                    defaultDueDays: dto.defaultDueDays ?? 0,
                    openingBalance,
                    currentBalance: openingBalance,
                    iban: dto.iban,
                    bankName: dto.bankName,
                    paymentNotes: dto.paymentNotes,
                    creditLimitAction: dto.creditLimitAction ?? 'WARN',
                    notes: dto.notes,
                },
            });

            if (!openingBalance.eq(0)) {
                await tx.ledgerMovement.create({
                    data: {
                        tenantId,
                        customerId: created.id,
                        type: 'OPENING_BALANCE',
                        amount: openingBalance,
                        balanceAfter: openingBalance,
                        description: 'Açılış bakiyesi',
                        createdBy: userId,
                    },
                });
            }

            return created;
        });

        await this.prisma.auditLog.create({
            data: { tenantId, userId, entityType: 'Customer', entityId: customer.id, action: 'CREATE', newValue: customer as any },
        });

        this.logger.log(`[tenantId=${tenantId}] Customer created: ${customer.name} ${customer.surname ?? ''}`);
        return customer;
    }

    async findAll(tenantId: string, options: { page?: number; limit?: number; search?: string; type?: CustomerTypeEnum }) {
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where: any = { tenantId, isDeleted: false };
        if (options.type) where.type = options.type;
        if (options.search) {
            where.OR = [
                { code: { contains: options.search, mode: 'insensitive' } },
                { name: { contains: options.search, mode: 'insensitive' } },
                { surname: { contains: options.search, mode: 'insensitive' } },
                { companyName: { contains: options.search, mode: 'insensitive' } },
                { phone: { contains: options.search } },
                { taxId: { contains: options.search } },
            ];
        }

        const [customers, total] = await Promise.all([
            this.prisma.customer.findMany({ where, orderBy: [{ name: 'asc' }], skip, take: limit }),
            this.prisma.customer.count({ where }),
        ]);

        const customerIds = customers.map((c) => c.id);
        const spendByCustomer: Record<string, number> = {};
        if (customerIds.length > 0) {
            const sums = await this.prisma.order.groupBy({
                by: ['customerId'],
                where: {
                    tenantId,
                    customerId: { in: customerIds },
                    isDeleted: false,
                    status: OrderStatus.COMPLETED,
                },
                _sum: { grandTotal: true },
            });
            for (const row of sums) {
                if (row.customerId) {
                    spendByCustomer[row.customerId] = Number(row._sum.grandTotal ?? 0);
                }
            }
        }

        const data = customers.map((c) => ({
            ...c,
            totalSpent: spendByCustomer[c.id] ?? 0,
        }));

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findById(tenantId: string, id: string) {
        const customer = await this.prisma.customer.findFirst({
            where: { id, tenantId, isDeleted: false },
        });
        if (!customer) throw new NotFoundException('Müşteri bulunamadı');
        return customer;
    }

    /**
     * Orders linked to customer (open_account / müşterili satışlar).
     */
    async listCustomerOrders(
        tenantId: string,
        customerId: string,
        options: { page?: number; limit?: number },
    ) {
        await this.findById(tenantId, customerId);
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where = {
            tenantId,
            customerId,
            isDeleted: false,
            status: OrderStatus.COMPLETED,
        };

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: { payments: true },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            data: orders,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
        };
    }

    async update(tenantId: string, id: string, dto: UpdateCustomerDto, userId: string) {
        const existing = await this.findById(tenantId, id);
        const data: any = { ...dto };
        if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
        if (dto.code) data.code = dto.code.trim();

        const updated = await this.prisma.customer.update({ where: { id }, data });
        await this.prisma.auditLog.create({
            data: { tenantId, userId, entityType: 'Customer', entityId: id, action: 'UPDATE', oldValue: existing as any, newValue: updated as any },
        });
        return updated;
    }

    async remove(tenantId: string, id: string, userId: string) {
        await this.findById(tenantId, id);
        await this.prisma.customer.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
        });
        await this.prisma.auditLog.create({
            data: { tenantId, userId, entityType: 'Customer', entityId: id, action: 'DELETE' },
        });
    }

    /**
     * Record a payment (tahsilat) from customer — updates balance in real-time.
     */
    async recordPayment(tenantId: string, dto: CreatePaymentDto, userId: string) {
        return this.prisma.executeTransaction(async (tx) => {
            const customer = await tx.customer.findFirst({
                where: { id: dto.customerId, tenantId, isDeleted: false },
            });
            if (!customer) throw new NotFoundException('Müşteri bulunamadı');

            const paymentAmount = new Decimal(dto.amount);
            const newBalance = customer.currentBalance.sub(paymentAmount);

            await tx.customer.update({
                where: { id: dto.customerId },
                data: { currentBalance: newBalance },
            });

            const movement = await tx.ledgerMovement.create({
                data: {
                    tenantId,
                    customerId: dto.customerId,
                    type: dto.method,
                    amount: paymentAmount.neg(),
                    balanceAfter: newBalance,
                    description: dto.description ?? `Tahsilat — ${dto.method}`,
                    reference: dto.reference,
                    createdBy: userId,
                },
            });

            await tx.auditLog.create({
                data: { tenantId, userId, entityType: 'LedgerMovement', entityId: movement.id, action: 'CREATE', newValue: { type: 'PAYMENT', amount: dto.amount } as any },
            });

            this.logger.log(`[tenantId=${tenantId}] Payment recorded: ${dto.amount} from customer=${dto.customerId}`);

            return { movement, newBalance };
        });
    }

    async getSummary(
        tenantId: string,
        customerId: string,
        options: { dateFrom?: string; dateTo?: string },
    ) {
        const customer = await this.findById(tenantId, customerId);
        const where: any = { tenantId, customerId };
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
            if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
        }
        const movements = await this.prisma.ledgerMovement.findMany({
            where,
            select: { amount: true },
        });

        let debitTotal = new Decimal(0);
        let creditTotal = new Decimal(0);
        for (const m of movements) {
            if (m.amount.greaterThan(0)) debitTotal = debitTotal.add(m.amount);
            if (m.amount.lessThan(0)) creditTotal = creditTotal.add(m.amount.abs());
        }

        return {
            customerId,
            currentBalance: customer.currentBalance,
            creditLimit: customer.creditLimit,
            debitTotal,
            creditTotal,
        };
    }

    /**
     * Get customer statement (hesap ekstresi).
     */
    async getStatement(tenantId: string, customerId: string, options: { dateFrom?: string; dateTo?: string; page?: number; limit?: number }) {
        const customer = await this.findById(tenantId, customerId);

        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 50, 100);
        const skip = (page - 1) * limit;

        const where: any = { tenantId, customerId };
        if (options.dateFrom || options.dateTo) {
            where.createdAt = {};
            if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
            if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
        }

        const [movements, total] = await Promise.all([
            this.prisma.ledgerMovement.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            this.prisma.ledgerMovement.count({ where }),
        ]);

        let debitTotal = new Decimal(0);
        let creditTotal = new Decimal(0);
        for (const m of movements) {
            if (m.amount.greaterThan(0)) debitTotal = debitTotal.add(m.amount);
            if (m.amount.lessThan(0)) creditTotal = creditTotal.add(m.amount.abs());
        }

        return {
            data: movements.map((m) => ({
                ...m,
                debit: m.amount.greaterThan(0) ? m.amount : new Decimal(0),
                credit: m.amount.lessThan(0) ? m.amount.abs() : new Decimal(0),
            })),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
            summary: {
                openingBalance: customer.openingBalance,
                currentBalance: customer.currentBalance,
                debitTotal,
                creditTotal,
            },
        };
    }

    /**
     * Get overdue customers (vadesi geçmiş bakiyeli).
     */
    async getOverdueCustomers(tenantId: string) {
        const customers = await this.prisma.customer.findMany({
            where: { tenantId, isDeleted: false, currentBalance: { gt: 0 } },
            orderBy: { currentBalance: 'desc' },
        });

        return {
            totalOverdue: customers.length,
            totalAmount: customers.reduce((sum, c) => sum.add(c.currentBalance), new Decimal(0)),
            customers: customers.map((c) => ({
                id: c.id,
                name: `${c.name} ${c.surname ?? ''}`.trim(),
                companyName: c.companyName,
                phone: c.phone,
                balance: c.currentBalance,
                creditLimit: c.creditLimit,
                overCreditLimit: c.currentBalance.greaterThan(c.creditLimit) && c.creditLimit.greaterThan(0),
            })),
        };
    }
}
