import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto/bank-account.dto';
import { BankAccount, BankAccountKind, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { normalizePagination } from '../../common/utils/pagination';
import {
  BANK_POS_SETTLEMENT_COLOR_TAG,
  apiKindFromBankAccount,
  isPosSettlementAccount,
} from './bank-account.helpers';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** API yanıtı: POS satırları CHECKING+etiketten türetilen `kind: POS_SETTLEMENT`. */
  private toApiAccount(row: BankAccount) {
    return {
      ...row,
      kind: apiKindFromBankAccount(row),
      openingBalance: row.openingBalance.toString(),
      currentBalance: row.currentBalance.toString(),
    };
  }

  /**
   * POS mutabakat hesabı Postgres enum'unda POS_SETTLEMENT istemez:
   * CHECKING + colorTag ile saklanır (migrate gerekmez).
   */
  private resolveCreateStorage(dto: CreateBankAccountDto): {
    kind: BankAccountKind;
    colorTag: string | null;
  } {
    if (dto.kind === 'POS_SETTLEMENT') {
      return { kind: BankAccountKind.CHECKING, colorTag: BANK_POS_SETTLEMENT_COLOR_TAG };
    }
    return {
      kind: (dto.kind ?? BankAccountKind.CHECKING) as BankAccountKind,
      colorTag: dto.colorTag?.trim() || null,
    };
  }

  private kindPatchFromUpdateDto(
    existing: BankAccount,
    kindInput: UpdateBankAccountDto['kind'] | undefined,
  ): Pick<Prisma.BankAccountUpdateInput, 'kind' | 'colorTag'> | null {
    if (kindInput === undefined) return null;

    if (kindInput === 'POS_SETTLEMENT') {
      return { kind: BankAccountKind.CHECKING, colorTag: BANK_POS_SETTLEMENT_COLOR_TAG };
    }

    if (kindInput === BankAccountKind.CHECKING) {
      if (isPosSettlementAccount(existing)) {
        return { kind: BankAccountKind.CHECKING, colorTag: null };
      }
      return { kind: BankAccountKind.CHECKING };
    }

    if (kindInput === BankAccountKind.CREDIT_CARD) {
      if (existing.colorTag === BANK_POS_SETTLEMENT_COLOR_TAG) {
        return { kind: BankAccountKind.CREDIT_CARD, colorTag: null };
      }
      return { kind: BankAccountKind.CREDIT_CARD };
    }

    return null;
  }

  async create(tenantId: string, dto: CreateBankAccountDto, userId: string) {
    const opening = new Decimal(dto.openingBalance ?? 0);
    const { kind, colorTag } = this.resolveCreateStorage(dto);

    const account = await this.prisma.bankAccount.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        bankName: dto.bankName.trim(),
        branchName: dto.branchName?.trim() || null,
        iban: dto.iban?.trim() || null,
        accountNumber: dto.accountNumber?.trim() || null,
        currency: (dto.currency ?? 'TRY').toUpperCase(),
        kind,
        colorTag,
        labelIcon: dto.labelIcon ?? null,
        openingBalance: opening,
        currentBalance: opening,
        openingBalanceAt: dto.openingBalanceAt ? new Date(dto.openingBalanceAt) : new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BankAccount',
        entityId: account.id,
        action: 'CREATE',
        newValue: {
          id: account.id,
          name: account.name,
          apiKind: apiKindFromBankAccount(account),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`[tenant=${tenantId}] BankAccount created ${account.id}`);
    return this.toApiAccount(account);
  }

  /** İşlem formu: havale=vadesiz (POS hariç), kart tahsilat=POS etiketi, kart ödeme=firma kartı */
  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      purpose?: 'bank_transfer' | 'card_collection' | 'card_payment';
    },
  ) {
    const { page, limit, skip } = normalizePagination(
      { page: options.page, limit: options.limit },
      { defaultLimit: 20, maxLimit: 100 },
    );
    const base = { tenantId, isDeleted: false } satisfies Prisma.BankAccountWhereInput;
    let where: Prisma.BankAccountWhereInput = base;

    if (options.purpose === 'bank_transfer') {
      where = {
        ...base,
        kind: BankAccountKind.CHECKING,
        OR: [{ colorTag: null }, { colorTag: { not: BANK_POS_SETTLEMENT_COLOR_TAG } }],
      };
    } else if (options.purpose === 'card_collection') {
      where = {
        ...base,
        kind: BankAccountKind.CHECKING,
        colorTag: BANK_POS_SETTLEMENT_COLOR_TAG,
      };
    } else if (options.purpose === 'card_payment') {
      where = { ...base, kind: BankAccountKind.CREDIT_CARD };
    }

    const [data, total] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.bankAccount.count({ where }),
    ]);

    return {
      data: data.map((row) => this.toApiAccount(row)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 },
    };
  }

  async findById(tenantId: string, id: string) {
    const row = await this.prisma.bankAccount.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!row) throw new NotFoundException('Banka hesabı bulunamadı');
    return row;
  }

  async findByIdApi(tenantId: string, id: string) {
    const row = await this.findById(tenantId, id);
    return this.toApiAccount(row);
  }

  async update(tenantId: string, id: string, dto: UpdateBankAccountDto, userId: string) {
    const existing = await this.findById(tenantId, id);
    const data: Prisma.BankAccountUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.bankName !== undefined) data.bankName = dto.bankName.trim();
    if (dto.branchName !== undefined) data.branchName = dto.branchName?.trim() || null;
    if (dto.iban !== undefined) data.iban = dto.iban?.trim() || null;
    if (dto.accountNumber !== undefined) data.accountNumber = dto.accountNumber?.trim() || null;
    if (dto.currency !== undefined) data.currency = dto.currency.toUpperCase();

    const kindPatch = this.kindPatchFromUpdateDto(existing, dto.kind);
    if (kindPatch) {
      if (kindPatch.kind !== undefined) data.kind = kindPatch.kind;
      if (kindPatch.colorTag !== undefined) data.colorTag = kindPatch.colorTag;
    }

    if (dto.colorTag !== undefined && dto.kind === undefined) {
      data.colorTag = dto.colorTag ?? null;
    }
    if (dto.labelIcon !== undefined) data.labelIcon = dto.labelIcon ?? null;

    const updated = await this.prisma.bankAccount.update({ where: { id }, data });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BankAccount',
        entityId: id,
        action: 'UPDATE',
        oldValue: existing as unknown as Prisma.InputJsonValue,
        newValue: updated as unknown as Prisma.InputJsonValue,
      },
    });
    return this.toApiAccount(updated);
  }

  async remove(tenantId: string, id: string, userId: string) {
    await this.findById(tenantId, id);
    await this.prisma.bankAccount.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
    });
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'BankAccount',
        entityId: id,
        action: 'DELETE',
      },
    });
  }

  async listMovements(
    tenantId: string,
    bankAccountId: string,
    options: { page?: number; limit?: number; dateFrom?: string; dateTo?: string },
  ) {
    await this.findById(tenantId, bankAccountId);

    const { page, limit, skip } = normalizePagination(
      { page: options.page, limit: options.limit },
      { defaultLimit: 50, maxLimit: 100 },
    );

    const where: Prisma.BankAccountMovementWhereInput = {
      tenantId,
      bankAccountId,
      isDeleted: false,
    };
    if (options.dateFrom || options.dateTo) {
      where.movementDate = {};
      if (options.dateFrom) where.movementDate.gte = new Date(options.dateFrom);
      if (options.dateTo) where.movementDate.lte = new Date(options.dateTo);
    }

    const [data, total] = await Promise.all([
      this.prisma.bankAccountMovement.findMany({
        where,
        orderBy: { movementDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bankAccountMovement.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0 } };
  }
}
