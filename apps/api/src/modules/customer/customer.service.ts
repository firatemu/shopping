import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  CreatePaymentDto,
  CustomerTypeEnum,
} from './dto/customer.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { LedgerMovement, OrderStatus, Prisma } from '@prisma/client';
import { normalizePagination } from '../../common/utils/pagination';
import { ledgerMovementTypeLabelTr } from '../../common/utils/ledger-movement-labels';
import { ExportService } from '../../common/services/export.service';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService,
  ) {}

  private async generateCustomerCode(tx: any, tenantId: string): Promise<string> {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { code: true } });
    const prefix = tenant?.code ?? 'UNK';
    // Find the highest existing numeric suffix for this tenant to avoid race-condition duplicates
    const last = await tx.customer.findFirst({
      where: { tenantId, code: { startsWith: `${prefix}-C` } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let next = 1;
    if (last?.code) {
      const m = last.code.match(/C(\d+)$/);
      if (m) next = parseInt(m[1], 10) + 1;
    }
    return `${prefix}-C${String(next).padStart(6, '0')}`;
  }

  async create(tenantId: string, dto: CreateCustomerDto, userId: string) {
    const customer = await this.prisma.executeTransaction(async (tx) => {
      const code = dto.code?.trim()
        ? dto.code.trim()
        : await this.generateCustomerCode(tx, tenantId);
      const openingBalance =
        dto.openingBalance !== undefined ? new Decimal(dto.openingBalance) : new Decimal(0);

      let created: Awaited<ReturnType<typeof tx.customer.create>>;
      try {
        created = await tx.customer.create({
          data: {
            tenantId,
            code,
            type: dto.type ?? CustomerTypeEnum.CUSTOMER,
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
      } catch (err: any) {
        if (err?.code === 'P2002') {
          throw new BadRequestException(`Bu cari kodu (${code}) zaten kullanıyor. Lütfen farklı bir kod girin veya boş bırakın.`);
        }
        throw err;
      }

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
      data: {
        tenantId,
        userId,
        entityType: 'Customer',
        entityId: customer.id,
        action: 'CREATE',
        newValue: customer as any,
      },
    });

    this.logger.log(
      `[tenantId=${tenantId}] Customer created: ${customer.name} ${customer.surname ?? ''}`,
    );
    return customer;
  }

  async findAll(
    tenantId: string,
    options: { page?: number; limit?: number; search?: string; type?: CustomerTypeEnum },
  ) {
    const { page, limit, skip } = normalizePagination(
      { page: options.page, limit: options.limit },
      { defaultLimit: 20, maxLimit: 100 },
    );

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
    const { page, limit, skip } = normalizePagination(
      { page: options.page, limit: options.limit },
      { defaultLimit: 20, maxLimit: 100 },
    );

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
    const data: any = { ...dto, updatedBy: userId };
    if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
    if (dto.code) data.code = dto.code.trim();

    const updated = await this.prisma.customer.update({ where: { id }, data });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Customer',
        entityId: id,
        action: 'UPDATE',
        oldValue: existing as any,
        newValue: updated as any,
      },
    });
    return updated;
  }

  async remove(tenantId: string, id: string, userId: string) {
    await this.findById(tenantId, id);

    // Check if customer has any ledger movements
    const hasMovements = await this.prisma.ledgerMovement.count({
      where: { tenantId, customerId: id, isDeleted: false },
    });
    if (hasMovements > 0) {
      throw new BadRequestException(
        'Hareketi olan cari hesap silinemez. Önce hareketleri temizleyin veya arşivleyin.',
      );
    }

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
          description: dto.description?.trim() || null,
          reference: dto.reference,
          createdBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'LedgerMovement',
          entityId: movement.id,
          action: 'CREATE',
          newValue: { type: 'PAYMENT', amount: dto.amount } as any,
        },
      });

      this.logger.log(
        `[tenantId=${tenantId}] Payment recorded: ${dto.amount} from customer=${dto.customerId}`,
      );

      return { movement, newBalance };
    });
  }

  async getSummary(
    tenantId: string,
    customerId: string,
    options: { dateFrom?: string; dateTo?: string },
  ) {
    const customer = await this.findById(tenantId, customerId);
    const where: any = { tenantId, customerId, isDeleted: false };
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
      currentBalance: customer.currentBalance.toString(),
      creditLimit: customer.creditLimit.toString(),
      debitTotal: debitTotal.toString(),
      creditTotal: creditTotal.toString(),
    };
  }

  private buildStatementWhere(
    tenantId: string,
    customerId: string,
    options: { dateFrom?: string; dateTo?: string },
  ): Prisma.LedgerMovementWhereInput {
    const where: Prisma.LedgerMovementWhereInput = { tenantId, customerId, isDeleted: false };
    if (options.dateFrom || options.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
      if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
    }
    return where;
  }

  private mapStatementMovement(m: LedgerMovement) {
    const debit = m.amount.greaterThan(0) ? m.amount : new Decimal(0);
    const credit = m.amount.lessThan(0) ? m.amount.abs() : new Decimal(0);
    const docPart = [m.documentType, m.documentNo].filter(Boolean).join(' ');
    return {
      id: m.id,
      createdAt: m.createdAt.toISOString(),
      type: m.type,
      typeLabel: ledgerMovementTypeLabelTr(m.type),
      /** Kullanıcı / işlem açıklaması (boş olabilir) */
      note: m.description?.trim() || null,
      reference: m.reference ?? null,
      documentType: m.documentType ?? null,
      documentNo: m.documentNo ?? null,
      documentSummary: docPart || null,
      debit: debit.toString(),
      credit: credit.toString(),
      balanceAfter: m.balanceAfter.toString(),
    };
  }

  /**
   * Get customer statement (hesap ekstresi).
   */
  async getStatement(
    tenantId: string,
    customerId: string,
    options: { dateFrom?: string; dateTo?: string; page?: number; limit?: number },
  ) {
    const customer = await this.findById(tenantId, customerId);
    const rollup = await this.getSummary(tenantId, customerId, {
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
    });

    const { page, limit, skip } = normalizePagination(
      { page: options.page, limit: options.limit },
      { defaultLimit: 50, maxLimit: 100 },
    );

    const where = this.buildStatementWhere(tenantId, customerId, options);

    const [movements, total] = await Promise.all([
      this.prisma.ledgerMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ledgerMovement.count({ where }),
    ]);

    return {
      data: movements.map((m) => this.mapStatementMovement(m)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
      summary: {
        openingBalance: customer.openingBalance.toString(),
        currentBalance: rollup.currentBalance,
        creditLimit: rollup.creditLimit,
        debitTotal: rollup.debitTotal,
        creditTotal: rollup.creditTotal,
      },
    };
  }

  async getStatementExportRows(
    tenantId: string,
    customerId: string,
    options: { dateFrom?: string; dateTo?: string; maxRows?: number },
  ) {
    await this.findById(tenantId, customerId);
    const max = Math.min(options.maxRows ?? 5000, 8000);
    const where = this.buildStatementWhere(tenantId, customerId, options);
    const movements = await this.prisma.ledgerMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: max,
    });
    return movements.map((m) => this.mapStatementMovement(m));
  }

  async exportStatementExcel(
    tenantId: string,
    customerId: string,
    options: { dateFrom?: string; dateTo?: string },
  ) {
    const [tenant, customer, rows] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      this.findById(tenantId, customerId),
      this.getStatementExportRows(tenantId, customerId, options),
    ]);
    const title = tenant?.name ? `${tenant.name} — Cari ekstre` : 'Cari hesap ekstresi';
    const nameLine = customer.companyName
      ? `${customer.companyName} (${[customer.name, customer.surname].filter(Boolean).join(' ')})`
      : [customer.name, customer.surname].filter(Boolean).join(' ');
    return this.exportService.generateExcel({
      sheetName: 'Ekstre',
      title: `${title} — ${nameLine} (${customer.code})`,
      columns: [
        { header: 'Tarih', key: 'date', width: 12 },
        { header: 'Tür', key: 'typeLabel', width: 22 },
        { header: 'Belge', key: 'document', width: 18 },
        { header: 'Açıklama', key: 'note', width: 28 },
        { header: 'Borç', key: 'debit', width: 14 },
        { header: 'Alacak', key: 'credit', width: 14 },
        { header: 'Bakiye', key: 'balance', width: 14 },
      ],
      rows: rows.map((r) => ({
        date: new Date(r.createdAt).toLocaleString('tr-TR', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
        typeLabel: r.typeLabel,
        document:
          r.documentSummary || [r.documentType, r.documentNo].filter(Boolean).join(' ') || '—',
        note: r.note || '—',
        debit: Number(r.debit) > 0 ? Number(r.debit) : '—',
        credit: Number(r.credit) > 0 ? Number(r.credit) : '—',
        balance: Number(r.balanceAfter),
      })),
    });
  }

  private formatTry(n: string | number): string {
    const v = typeof n === 'string' ? parseFloat(n) : n;
    if (!Number.isFinite(v)) return '—';
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v);
  }

  async exportStatementPdf(
    tenantId: string,
    customerId: string,
    options: {
      dateFrom?: string;
      dateTo?: string;
      paper?: 'A4' | 'A5';
      orientation?: 'portrait' | 'landscape';
    },
  ) {
    const [tenant, customer, rows] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.findById(tenantId, customerId),
      this.getStatementExportRows(tenantId, customerId, options),
    ]);

    const nameLine = customer.companyName
      ? `${customer.companyName} — ${[customer.name, customer.surname].filter(Boolean).join(' ')}`
      : [customer.name, customer.surname].filter(Boolean).join(' ');

    // Format period note
    let periodNote: string | undefined;
    if (options.dateFrom || options.dateTo) {
      periodNote = `${options.dateFrom ?? '…'} — ${options.dateTo ?? '…'}`;
    } else {
      periodNote = 'Tüm Dönemler';
    }

    // Calculate totals
    const totalDebit = rows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
    const totalCredit = rows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);

    return this.exportService.generateCustomerStatementPdf({
      // Tenant info - tenant has limited fields
      tenantName: tenant?.name ?? 'İşletme',
      // Customer info
      customerLine: nameLine,
      customerCode: customer.code,
      customerTaxId: customer.taxId || undefined,
      customerAddress: customer.address || undefined,
      // Period & summary
      periodNote,
      balanceNote: `Güncel Bakiye: ${this.formatTry(customer.currentBalance.toString())}`,
      closingBalance: customer.currentBalance.toString(),
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      paper: options.paper ?? 'A4',
      orientation: options.orientation ?? 'portrait',
      // Transaction rows - send raw numbers, PDF service will format with ₺
      rows: rows.map((r) => ({
        date: new Date(r.createdAt).toLocaleDateString('tr-TR'),
        typeLabel: r.typeLabel,
        document:
          r.documentSummary || [r.documentType, r.documentNo].filter(Boolean).join(' ') || '—',
        note: r.note || '—',
        debit: Number(r.debit) > 0 ? r.debit.toString() : '',
        credit: Number(r.credit) > 0 ? r.credit.toString() : '',
        balance: r.balanceAfter.toString(),
      })),
    });
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
        overCreditLimit:
          c.currentBalance.greaterThan(c.creditLimit) && c.creditLimit.greaterThan(0),
      })),
    };
  }
}
