import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePartnerFinanceOperationDto,
  UpdatePartnerFinanceOperationDto,
} from './dto/partner-finance.dto';
import { BankAccountKind, LedgerMovementType, PartnerFinanceKind, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { normalizePagination } from '../../common/utils/pagination';
import { isPosSettlementAccount, isVadesizForTransfer } from './bank-account.helpers';
import { ExportService } from '../../common/services/export.service';

const COLLECTION_KINDS = new Set<PartnerFinanceKind>([
  PartnerFinanceKind.CASH_COLLECTION,
  PartnerFinanceKind.CARD_COLLECTION,
  PartnerFinanceKind.TRANSFER_IN,
  PartnerFinanceKind.CHECK_RECEIVED,
  PartnerFinanceKind.PROMISSORY_RECEIVED,
  PartnerFinanceKind.CREDIT_VOUCHER,
]);

function isCollectionKind(kind: PartnerFinanceKind): boolean {
  return COLLECTION_KINDS.has(kind);
}

function ledgerMovementTypeForKind(kind: PartnerFinanceKind): LedgerMovementType {
  const map: Record<PartnerFinanceKind, LedgerMovementType> = {
    [PartnerFinanceKind.CASH_COLLECTION]: LedgerMovementType.PAYMENT_CASH,
    [PartnerFinanceKind.CARD_COLLECTION]: LedgerMovementType.PAYMENT_CARD,
    [PartnerFinanceKind.TRANSFER_IN]: LedgerMovementType.PAYMENT_TRANSFER,
    [PartnerFinanceKind.CHECK_RECEIVED]: LedgerMovementType.PAYMENT_CHECK,
    [PartnerFinanceKind.PROMISSORY_RECEIVED]: LedgerMovementType.PAYMENT_CHECK,
    [PartnerFinanceKind.CASH_PAYMENT]: LedgerMovementType.PAYMENT_OUT_CASH,
    [PartnerFinanceKind.CARD_PAYMENT]: LedgerMovementType.PAYMENT_OUT_CARD,
    [PartnerFinanceKind.TRANSFER_OUT]: LedgerMovementType.PAYMENT_OUT_TRANSFER,
    [PartnerFinanceKind.CHECK_ISSUED]: LedgerMovementType.PAYMENT_OUT_CHECK,
    [PartnerFinanceKind.PROMISSORY_ISSUED]: LedgerMovementType.PAYMENT_OUT_CHECK,
    [PartnerFinanceKind.DEBIT_VOUCHER]: LedgerMovementType.DEBIT_VOUCHER,
    [PartnerFinanceKind.CREDIT_VOUCHER]: LedgerMovementType.CREDIT_VOUCHER,
  };
  return map[kind];
}

@Injectable()
export class PartnerFinanceService {
  private readonly logger = new Logger(PartnerFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService,
  ) {}

  private applyCustomerBalance(
    current: Decimal,
    kind: PartnerFinanceKind,
    amount: Decimal,
  ): Decimal {
    return isCollectionKind(kind) ? current.sub(amount) : current.add(amount);
  }

  private signedLedgerAmount(kind: PartnerFinanceKind, amount: Decimal): Decimal {
    return isCollectionKind(kind) ? amount.neg() : amount;
  }

  private needsCashSession(kind: PartnerFinanceKind): boolean {
    return kind === PartnerFinanceKind.CASH_COLLECTION || kind === PartnerFinanceKind.CASH_PAYMENT;
  }

  private needsBankAccount(kind: PartnerFinanceKind): boolean {
    return (
      kind === PartnerFinanceKind.TRANSFER_IN ||
      kind === PartnerFinanceKind.TRANSFER_OUT ||
      kind === PartnerFinanceKind.CARD_COLLECTION ||
      kind === PartnerFinanceKind.CARD_PAYMENT
    );
  }

  private assertBankKindMatchesOperation(
    financeKind: PartnerFinanceKind,
    bank: { kind: BankAccountKind; colorTag: string | null },
  ) {
    if (
      financeKind === PartnerFinanceKind.TRANSFER_IN ||
      financeKind === PartnerFinanceKind.TRANSFER_OUT
    ) {
      if (!isVadesizForTransfer(bank)) {
        throw new BadRequestException(
          'Havale ve EFT işlemleri yalnızca vadesiz banka hesabı ile kaydedilebilir',
        );
      }
      return;
    }
    if (financeKind === PartnerFinanceKind.CARD_COLLECTION) {
      if (!isPosSettlementAccount(bank)) {
        throw new BadRequestException(
          'Kredi kartı tahsilatı yalnızca POS mutabakat hesabı ile kaydedilebilir',
        );
      }
      return;
    }
    if (financeKind === PartnerFinanceKind.CARD_PAYMENT) {
      if (bank.kind !== BankAccountKind.CREDIT_CARD) {
        throw new BadRequestException(
          'Firma kredi kartı ödemesi yalnızca firma kredi kartı hesabı ile kaydedilebilir',
        );
      }
    }
  }

  private createsBankMovement(
    kind: PartnerFinanceKind,
    bankAccountId: string | undefined,
  ): boolean {
    if (!bankAccountId) return false;
    if (this.needsBankAccount(kind)) return true;
    if (kind === PartnerFinanceKind.CARD_COLLECTION || kind === PartnerFinanceKind.CARD_PAYMENT) {
      return true;
    }
    return false;
  }

  private async nextDocumentNo(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { code: true },
    });
    const prefix = tenant?.code ?? 'OP';
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const count = await tx.partnerFinanceOperation.count({
      where: { tenantId, createdAt: { gte: start } },
    });
    const y = start.getFullYear();
    const mo = String(start.getMonth() + 1).padStart(2, '0');
    const d = String(start.getDate()).padStart(2, '0');
    return `${prefix}-OP-${y}${mo}${d}-${String(count + 1).padStart(5, '0')}`;
  }

  private async recomputeCustomerBalances(
    tx: Prisma.TransactionClient,
    tenantId: string,
    customerId: string,
  ) {
    const rows = await tx.ledgerMovement.findMany({
      where: { tenantId, customerId, isDeleted: false },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    let running = new Decimal(0);
    for (const m of rows) {
      running = running.add(m.amount);
      await tx.ledgerMovement.update({
        where: { id: m.id },
        data: { balanceAfter: running },
      });
    }
    await tx.customer.update({
      where: { id: customerId },
      data: { currentBalance: running },
    });
  }

  private async recomputeBankBalance(
    tx: Prisma.TransactionClient,
    tenantId: string,
    bankAccountId: string,
  ) {
    const acc = await tx.bankAccount.findFirst({
      where: { id: bankAccountId, tenantId, isDeleted: false },
    });
    if (!acc) return;

    const agg = await tx.bankAccountMovement.aggregate({
      where: { tenantId, bankAccountId, isDeleted: false },
      _sum: { amount: true },
    });
    const flow = new Decimal(agg._sum.amount ?? 0);
    const newBal = acc.openingBalance.add(flow);
    await tx.bankAccount.update({
      where: { id: bankAccountId },
      data: { currentBalance: newBal },
    });

    const rows = await tx.bankAccountMovement.findMany({
      where: { tenantId, bankAccountId, isDeleted: false },
      orderBy: [{ movementDate: 'asc' }, { id: 'asc' }],
    });
    let running = acc.openingBalance;
    for (const m of rows) {
      running = running.add(m.amount);
      await tx.bankAccountMovement.update({
        where: { id: m.id },
        data: { balanceAfter: running },
      });
    }
  }

  private validateDto(
    kind: PartnerFinanceKind,
    cashRegisterSessionId?: string,
    bankAccountId?: string,
  ) {
    if (this.needsCashSession(kind) && !cashRegisterSessionId) {
      throw new BadRequestException('Nakit işlemler için kasa oturumu seçilmelidir');
    }
    if (this.needsCashSession(kind) && bankAccountId) {
      throw new BadRequestException('Nakit işlemlerde banka hesabı kullanılmaz');
    }
    if (this.needsBankAccount(kind) && !bankAccountId) {
      if (kind === PartnerFinanceKind.CARD_COLLECTION) {
        throw new BadRequestException(
          'Kredi kartı tahsilatı için POS mutabakat hesabı seçilmelidir',
        );
      }
      if (kind === PartnerFinanceKind.CARD_PAYMENT) {
        throw new BadRequestException(
          'Firma kredi kartı ödemesi için firma kredi kartı hesabı seçilmelidir',
        );
      }
      throw new BadRequestException('Havale/EFT işlemleri için vadesiz banka hesabı seçilmelidir');
    }
    if (!this.needsCashSession(kind) && cashRegisterSessionId) {
      throw new BadRequestException('Bu işlem türü için kasa oturumu kullanılmaz');
    }

    if (bankAccountId && !this.needsBankAccount(kind)) {
      throw new BadRequestException('Bu işlem türü için banka hesabı seçilmez');
    }
  }

  async create(tenantId: string, dto: CreatePartnerFinanceOperationDto, userId: string) {
    this.validateDto(dto.kind, dto.cashRegisterSessionId, dto.bankAccountId);

    const amt = new Decimal(dto.amount);

    return this.prisma.executeTransaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: dto.customerId, tenantId, isDeleted: false },
      });
      if (!customer) throw new NotFoundException('Cari bulunamadı');

      if (dto.cashRegisterSessionId) {
        const session = await tx.cashRegisterSession.findFirst({
          where: {
            id: dto.cashRegisterSessionId,
            tenantId,
            status: 'OPEN',
          },
        });
        if (!session) throw new NotFoundException('Açık kasa oturumu bulunamadı');
      }

      const bankAccountId: string | null = dto.bankAccountId ?? null;
      if (bankAccountId) {
        const bank = await tx.bankAccount.findFirst({
          where: { id: bankAccountId, tenantId, isDeleted: false },
        });
        if (!bank) throw new NotFoundException('Banka hesabı bulunamadı');
        this.assertBankKindMatchesOperation(dto.kind, bank);
      }

      const documentNo = await this.nextDocumentNo(tx, tenantId);
      const opDate = new Date(dto.operationDate);

      const operation = await tx.partnerFinanceOperation.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          kind: dto.kind,
          amount: amt,
          operationDate: opDate,
          documentNo,
          description: dto.description?.trim() || null,
          bankAccountId,
          cashRegisterSessionId: dto.cashRegisterSessionId ?? null,
          metadata: (dto.metadata ?? {}) as Prisma.InputJsonValue,
          createdBy: userId,
        },
      });

      const newCustomerBal = this.applyCustomerBalance(customer.currentBalance, dto.kind, amt);

      await tx.customer.update({
        where: { id: dto.customerId },
        data: { currentBalance: newCustomerBal },
      });

      const ledgerAmount = this.signedLedgerAmount(dto.kind, amt);
      await tx.ledgerMovement.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          type: ledgerMovementTypeForKind(dto.kind),
          amount: ledgerAmount,
          balanceAfter: newCustomerBal,
          partnerFinanceOperationId: operation.id,
          documentNo: documentNo,
          description: dto.description?.trim() ?? undefined,
          createdBy: userId,
        },
      });

      if (dto.cashRegisterSessionId) {
        const session = await tx.cashRegisterSession.findFirst({
          where: { id: dto.cashRegisterSessionId, tenantId, status: 'OPEN' },
        });
        if (!session) throw new NotFoundException('Kasa oturumu bulunamadı');
        const delta = dto.kind === PartnerFinanceKind.CASH_COLLECTION ? amt : amt.neg();
        const newCash = session.totalCash.add(delta);
        if (newCash.lt(0)) {
          throw new BadRequestException('Kasada yeterli nakit yok');
        }
        await tx.cashRegisterSession.update({
          where: { id: session.id },
          data: { totalCash: newCash },
        });
      }

      if (this.createsBankMovement(dto.kind, bankAccountId ?? undefined) && bankAccountId) {
        const bank = await tx.bankAccount.findFirst({
          where: { id: bankAccountId, tenantId, isDeleted: false },
        });
        if (!bank) throw new NotFoundException('Banka hesabı bulunamadı');

        let signedBank = new Decimal(0);
        if (
          dto.kind === PartnerFinanceKind.TRANSFER_IN ||
          dto.kind === PartnerFinanceKind.CARD_COLLECTION
        ) {
          signedBank = amt;
        } else {
          signedBank = amt.neg();
        }

        const newBankBal = bank.currentBalance.add(signedBank);
        await tx.bankAccountMovement.create({
          data: {
            tenantId,
            bankAccountId,
            partnerFinanceOperationId: operation.id,
            amount: signedBank,
            balanceAfter: newBankBal,
            description: dto.description?.trim() || null,
            movementDate: opDate,
            createdBy: userId,
          },
        });
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: { currentBalance: newBankBal },
        });
        await this.recomputeBankBalance(tx, tenantId, bankAccountId);
      }

      await this.recomputeCustomerBalances(tx, tenantId, dto.customerId);

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'PartnerFinanceOperation',
          entityId: operation.id,
          action: 'CREATE',
          newValue: {
            kind: dto.kind,
            amount: dto.amount,
            documentNo,
            customerId: dto.customerId,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`[tenant=${tenantId}] PartnerFinance created ${operation.id} ${documentNo}`);

      return operation;
    });
  }

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      customerId?: string;
      kind?: PartnerFinanceKind;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const { page, limit, skip } = normalizePagination(
      { page: options.page, limit: options.limit },
      { defaultLimit: 20, maxLimit: 100 },
    );

    const where: Prisma.PartnerFinanceOperationWhereInput = {
      tenantId,
      isDeleted: false,
    };
    if (options.customerId) where.customerId = options.customerId;
    if (options.kind) where.kind = options.kind;
    if (options.dateFrom || options.dateTo) {
      where.operationDate = {};
      if (options.dateFrom) where.operationDate.gte = new Date(options.dateFrom);
      if (options.dateTo) where.operationDate.lte = new Date(options.dateTo);
    }

    const [rows, total] = await Promise.all([
      this.prisma.partnerFinanceOperation.findMany({
        where,
        orderBy: { operationDate: 'desc' },
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, code: true, name: true, surname: true, companyName: true },
          },
          createdByUser: { select: { id: true, firstName: true, lastName: true } },
          updatedByUser: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.partnerFinanceOperation.count({ where }),
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      customerId: row.customerId,
      kind: row.kind,
      amount: row.amount.toString(),
      operationDate: row.operationDate.toISOString(),
      documentNo: row.documentNo,
      description: row.description,
      bankAccountId: row.bankAccountId,
      cashRegisterSessionId: row.cashRegisterSessionId,
      metadata: row.metadata,
      createdBy: row.createdBy,
      createdByName: row.createdByUser
        ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}`.trim()
        : null,
      updatedBy: row.updatedBy,
      updatedByName: row.updatedByUser
        ? `${row.updatedByUser.firstName} ${row.updatedByUser.lastName}`.trim()
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
      customer: row.customer,
    }));

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
    };
  }

  async findById(tenantId: string, id: string) {
    const op = await this.prisma.partnerFinanceOperation.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        customer: true,
        bankAccount: true,
        ledgerMovements: { where: { isDeleted: false } },
        bankAccountMovements: { where: { isDeleted: false } },
      },
    });
    if (!op) throw new NotFoundException('İşlem bulunamadı');
    return op;
  }

  async generateOperationReceipt(tenantId: string, id: string) {
    const op = await this.prisma.partnerFinanceOperation.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        customer: true,
        bankAccount: true,
        ledgerMovements: { where: { isDeleted: false } },
        bankAccountMovements: { where: { isDeleted: false } },
      },
    });
    if (!op) throw new NotFoundException('İşlem bulunamadı');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');

    const W = 48;
    const KIND_LABEL: Record<string, string> = {
      CASH_COLLECTION: 'Nakit tahsilat',
      CARD_COLLECTION: 'Kredi kartı tahsilat (POS)',
      TRANSFER_IN: 'Gelen havale/EFT',
      CHECK_RECEIVED: 'Alınan çek',
      PROMISSORY_RECEIVED: 'Alınan senet',
      CASH_PAYMENT: 'Nakit ödeme',
      CARD_PAYMENT: 'Firma kredi kartı ödemesi',
      TRANSFER_OUT: 'Giden havale/EFT',
      CHECK_ISSUED: 'Verilen çek',
      PROMISSORY_ISSUED: 'Verilen senet',
      DEBIT_VOUCHER: 'Borç dekontu',
      CREDIT_VOUCHER: 'Alacak dekontu',
    };

    const pad = (left: string, right: string, width: number) => {
      const p = width - left.length - right.length;
      return p <= 0 ? `${left} ${right}` : `${left}${' '.repeat(p)}${right}`;
    };

    const divider = '═'.repeat(W);
    const thinDivider = '─'.repeat(W);
    const fmtMoney = (n: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n);

    const custName = op.customer.companyName
      ?? `${op.customer.name} ${op.customer.surname ?? ''}`.trim();
    const custInfo = [op.customer.code, custName].filter(Boolean).join(' — ');

    const lines: string[] = [
      tenant.name.toUpperCase(),
      '',
      divider,
      `Makbuz No: ${op.documentNo}`,
      `Tarih   : ${new Date(op.operationDate).toLocaleDateString('tr-TR')}`,
      divider,
      `Cari    : ${custInfo}`,
      `İşlem   : ${KIND_LABEL[op.kind] ?? op.kind}`,
      '',
    ];

    if (op.bankAccount) {
      lines.push(`Banka   : ${op.bankAccount.name} (${op.bankAccount.accountNumber ?? '—'})`);
      lines.push('');
    }

    lines.push(thinDivider);
    lines.push(pad('AÇIKLAMA', 'TUTAR', W));
    lines.push(thinDivider);

    const isCollection = [
      'CASH_COLLECTION', 'CARD_COLLECTION', 'TRANSFER_IN',
      'CHECK_RECEIVED', 'PROMISSORY_RECEIVED', 'CREDIT_VOUCHER'
    ].includes(op.kind);
    const signedAmount = isCollection ? Number(op.amount) : -Number(op.amount);
    const signLabel = signedAmount >= 0 ? 'ALACAK' : 'BORÇ';

    lines.push(pad(op.description ?? '—', fmtMoney(Math.abs(signedAmount)), W));
    lines.push(thinDivider);
    lines.push(pad(`(${signLabel})`, fmtMoney(Math.abs(signedAmount)), W));
    lines.push(divider);
    lines.push('');

    // Signature lines
    lines.push(pad('Hazırlayan: ___________', 'Onay: ___________', W));

    const receiptText = lines.join('\n');

    return {
      operationId: op.id,
      documentNo: op.documentNo,
      textReceipt: receiptText,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateOperationReceiptPdf(
    tenantId: string,
    id: string,
    options?: { paper?: 'A4' | 'A5'; orientation?: 'portrait' | 'landscape' },
  ) {
    const op = await this.prisma.partnerFinanceOperation.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: { customer: true, bankAccount: true },
    });
    if (!op) throw new NotFoundException('İşlem bulunamadı');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');

    const KIND_LABEL: Record<string, string> = {
      CASH_COLLECTION: 'Nakit tahsilat',
      CARD_COLLECTION: 'Kredi kartı tahsilat (POS)',
      TRANSFER_IN: 'Gelen havale/EFT',
      CHECK_RECEIVED: 'Alınan çek',
      PROMISSORY_RECEIVED: 'Alınan senet',
      CASH_PAYMENT: 'Nakit ödeme',
      CARD_PAYMENT: 'Firma kredi kartı ödemesi',
      TRANSFER_OUT: 'Giden havale/EFT',
      CHECK_ISSUED: 'Verilen çek',
      PROMISSORY_ISSUED: 'Verilen senet',
      DEBIT_VOUCHER: 'Borç dekontu',
      CREDIT_VOUCHER: 'Alacak dekontu',
    };

    const custName = op.customer.companyName
      ?? `${op.customer.name} ${op.customer.surname ?? ''}`.trim();

    const isCollection = [
      'CASH_COLLECTION', 'CARD_COLLECTION', 'TRANSFER_IN',
      'CHECK_RECEIVED', 'PROMISSORY_RECEIVED', 'CREDIT_VOUCHER',
    ].includes(op.kind);

    return this.exportService.generatePartnerFinanceReceiptPdf({
      tenantName: tenant.name,
      tenantTaxId: tenant.taxId ?? undefined,
      documentNo: op.documentNo,
      operationDate: new Date(op.operationDate).toLocaleDateString('tr-TR'),
      operationKindLabel: KIND_LABEL[op.kind] ?? op.kind,
      customerLine: custName,
      customerCode: op.customer.code,
      amount: op.amount.toString(),
      isCollection,
      bankAccountInfo: op.bankAccount
        ? `${op.bankAccount.name} (${op.bankAccount.accountNumber ?? '—'})`
        : undefined,
      description: op.description ?? '—',
      paper: options?.paper,
      orientation: options?.orientation,
    });
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdatePartnerFinanceOperationDto,
    userId: string,
  ) {
    return this.prisma.executeTransaction(async (tx) => {
      const existing = await tx.partnerFinanceOperation.findFirst({
        where: { id, tenantId, isDeleted: false },
      });
      if (!existing) throw new NotFoundException('İşlem bulunamadı');

      const oldAmount = existing.amount;
      const data: Prisma.PartnerFinanceOperationUpdateInput = { updatedBy: userId };

      if (dto.operationDate) data.operationDate = new Date(dto.operationDate);
      if (dto.description !== undefined) data.description = dto.description?.trim() || null;
      if (dto.metadata !== undefined) data.metadata = dto.metadata as Prisma.InputJsonValue;
      if (dto.amount !== undefined) {
        data.amount = new Decimal(dto.amount);
      }

      const updated = await tx.partnerFinanceOperation.update({
        where: { id },
        data,
      });

      if (dto.amount !== undefined && !new Decimal(dto.amount).equals(oldAmount)) {
        const ledgerRows = await tx.ledgerMovement.findMany({
          where: {
            tenantId,
            partnerFinanceOperationId: id,
            isDeleted: false,
          },
        });
        if (ledgerRows.length !== 1) {
          throw new BadRequestException('Beklenmedik cari hareket yapısı; tutar güncellenemedi');
        }
        const lm = ledgerRows[0];
        const newAmt = new Decimal(dto.amount);
        const newLedgerAmt = this.signedLedgerAmount(existing.kind, newAmt);
        await tx.ledgerMovement.update({
          where: { id: lm.id },
          data: { amount: newLedgerAmt },
        });

        const oldBank = existing.bankAccountId;
        if (oldBank && this.createsBankMovement(existing.kind, oldBank)) {
          const movements = await tx.bankAccountMovement.findMany({
            where: { tenantId, partnerFinanceOperationId: id, isDeleted: false },
          });
          if (movements.length === 1) {
            const bm = movements[0];
            let signedBank = new Decimal(0);
            if (
              existing.kind === PartnerFinanceKind.TRANSFER_IN ||
              existing.kind === PartnerFinanceKind.CARD_COLLECTION
            ) {
              signedBank = newAmt;
            } else {
              signedBank = newAmt.neg();
            }
            await tx.bankAccountMovement.update({
              where: { id: bm.id },
              data: { amount: signedBank },
            });
            await this.recomputeBankBalance(tx, tenantId, oldBank);
          }
        }

        await this.recomputeCustomerBalances(tx, tenantId, existing.customerId);
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'PartnerFinanceOperation',
          entityId: id,
          action: 'UPDATE',
          oldValue: {
            amount: oldAmount.toString(),
            operationDate: data.operationDate ? existing.operationDate.toISOString() : undefined,
          } as unknown as Prisma.InputJsonValue,
          newValue: {
            amount: updated.amount.toString(),
            operationDate: updated.operationDate.toISOString(),
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  async remove(tenantId: string, id: string, userId: string) {
    return this.prisma.executeTransaction(async (tx) => {
      const existing = await tx.partnerFinanceOperation.findFirst({
        where: { id, tenantId, isDeleted: false },
      });
      if (!existing) throw new NotFoundException('İşlem bulunamadı');

      const now = new Date();

      await tx.partnerFinanceOperation.update({
        where: { id },
        data: { isDeleted: true, deletedAt: now, deletedBy: userId },
      });

      await tx.ledgerMovement.updateMany({
        where: { tenantId, partnerFinanceOperationId: id },
        data: { isDeleted: true, deletedAt: now, deletedBy: userId },
      });

      await tx.bankAccountMovement.updateMany({
        where: { tenantId, partnerFinanceOperationId: id },
        data: { isDeleted: true, deletedAt: now, deletedBy: userId },
      });

      if (existing.cashRegisterSessionId) {
        const session = await tx.cashRegisterSession.findFirst({
          where: { id: existing.cashRegisterSessionId, tenantId },
        });
        if (session && session.status === 'OPEN') {
          const amt = existing.amount;
          const delta = existing.kind === PartnerFinanceKind.CASH_COLLECTION ? amt.neg() : amt;
          const newCash = session.totalCash.add(delta);
          await tx.cashRegisterSession.update({
            where: { id: session.id },
            data: { totalCash: newCash.lt(0) ? new Decimal(0) : newCash },
          });
        }
      }

      if (existing.bankAccountId) {
        await this.recomputeBankBalance(tx, tenantId, existing.bankAccountId);
      }

      await this.recomputeCustomerBalances(tx, tenantId, existing.customerId);

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'PartnerFinanceOperation',
          entityId: id,
          action: 'DELETE',
          oldValue: {
            kind: existing.kind,
            amount: existing.amount.toString(),
            documentNo: existing.documentNo,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`[tenant=${tenantId}] PartnerFinance soft-deleted ${id}`);
    });
  }

  /** Vadesi yaklaşan çek/senet (metadata.dueDate ISO string) — hatırlatıcı paneli için */
  async listUpcomingInstruments(
    tenantId: string,
    options: { daysAhead?: number; includeKinds?: PartnerFinanceKind[] },
  ) {
    const days = options.daysAhead ?? 30;
    const kinds = options.includeKinds ?? [
      PartnerFinanceKind.CHECK_RECEIVED,
      PartnerFinanceKind.CHECK_ISSUED,
      PartnerFinanceKind.PROMISSORY_RECEIVED,
      PartnerFinanceKind.PROMISSORY_ISSUED,
    ];
    const end = new Date();
    end.setDate(end.getDate() + days);

    const rows = await this.prisma.partnerFinanceOperation.findMany({
      where: {
        tenantId,
        isDeleted: false,
        kind: { in: kinds },
        operationDate: { lte: end },
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true, surname: true, companyName: true },
        },
      },
      orderBy: { operationDate: 'asc' },
      take: 200,
    });

    return rows.filter((r) => {
      const meta = r.metadata as { dueDate?: string } | null;
      if (!meta?.dueDate) return true;
      const due = new Date(meta.dueDate);
      return !Number.isNaN(due.getTime()) && due <= end;
    });
  }
}
