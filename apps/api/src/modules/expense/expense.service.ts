import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ExpenseType, Expense, ExpenseCategory, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

const expenseIncludeCategory = { category: true } as const;

type ExpenseWithCategory = Expense & { category: ExpenseCategory };

@Injectable()
export class ExpenseService {
    private readonly logger = new Logger(ExpenseService.name);

    constructor(private readonly prisma: PrismaService) { }

    private toJsonExpense(row: ExpenseWithCategory) {
        return {
            id: row.id,
            tenantId: row.tenantId,
            type: row.type,
            categoryId: row.categoryId,
            category: {
                id: row.category.id,
                name: row.category.name,
                kind: row.category.kind,
            },
            categoryName: row.category.name,
            amount: Number(row.amount),
            description: row.description,
            date: row.date.toISOString(),
            isRecurring: row.isRecurring,
            recurringDay: row.recurringDay,
            reference: row.reference,
            createdBy: row.createdBy,
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }

    async createCategory(tenantId: string, name: string, kind: ExpenseType) {
        const trimmed = name.trim();
        if (!trimmed) throw new BadRequestException('Kategori adı zorunludur');
        try {
            return await this.prisma.expenseCategory.create({
                data: { tenantId, name: trimmed, kind },
            });
        } catch (e) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new BadRequestException('Bu isim ve türde kategori zaten tanımlı');
            }
            throw e;
        }
    }

    async listCategories(tenantId: string, kind?: ExpenseType) {
        return this.prisma.expenseCategory.findMany({
            where: {
                tenantId,
                isActive: true,
                ...(kind ? { kind } : {}),
            },
            orderBy: [{ kind: 'asc' }, { name: 'asc' }],
        });
    }

    async resolveCategory(tenantId: string, categoryId: string, type: ExpenseType) {
        const cat = await this.prisma.expenseCategory.findFirst({
            where: { id: categoryId, tenantId, isActive: true },
        });
        if (!cat) throw new BadRequestException('Kategori bulunamadı');
        if (cat.kind !== type) {
            throw new BadRequestException('Seçilen kategori bu işlem türü ile uyumsuz (gelir/gider)');
        }
        return cat;
    }

    async create(
        tenantId: string,
        dto: {
            type: ExpenseType;
            categoryId: string;
            amount: number;
            description?: string;
            date?: string;
            isRecurring?: boolean;
            recurringDay?: number;
            reference?: string;
        },
        userId: string,
    ) {
        await this.resolveCategory(tenantId, dto.categoryId, dto.type);
        const row = await this.prisma.expense.create({
            data: {
                tenantId,
                type: dto.type,
                categoryId: dto.categoryId,
                amount: dto.amount,
                description: dto.description,
                date: dto.date ? new Date(dto.date) : new Date(),
                isRecurring: dto.isRecurring ?? false,
                recurringDay: dto.recurringDay,
                reference: dto.reference,
                createdBy: userId,
            },
            include: expenseIncludeCategory,
        });
        this.logger.log(`[tenantId=${tenantId}] ${dto.type} created: categoryId=${dto.categoryId} — ${dto.amount}`);
        return this.toJsonExpense(row);
    }

    async findAll(
        tenantId: string,
        options: {
            page?: number;
            limit?: number;
            type?: string;
            categoryId?: string;
            dateFrom?: string;
            dateTo?: string;
            search?: string;
        },
    ) {
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where: any = { tenantId, isDeleted: false };
        if (options.type) where.type = options.type;
        if (options.categoryId) where.categoryId = options.categoryId;
        if (options.dateFrom || options.dateTo) {
            where.date = {};
            if (options.dateFrom) where.date.gte = new Date(options.dateFrom);
            if (options.dateTo) where.date.lte = new Date(options.dateTo);
        }
        const s = options.search?.trim();
        if (s) {
            where.OR = [
                { description: { contains: s, mode: 'insensitive' as const } },
                { reference: { contains: s, mode: 'insensitive' as const } },
                { category: { name: { contains: s, mode: 'insensitive' as const } } },
            ];
        }

        const [rows, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                orderBy: { date: 'desc' },
                skip,
                take: limit,
                include: expenseIncludeCategory,
            }),
            this.prisma.expense.count({ where }),
        ]);

        return {
            data: rows.map((e) => this.toJsonExpense(e as ExpenseWithCategory)),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(tenantId: string, id: string) {
        const expense = await this.prisma.expense.findFirst({
            where: { id, tenantId, isDeleted: false },
            include: expenseIncludeCategory,
        });
        if (!expense) throw new NotFoundException('Kayıt bulunamadı');
        return this.toJsonExpense(expense as ExpenseWithCategory);
    }

    async update(
        tenantId: string,
        id: string,
        dto: Partial<{ categoryId: string; amount: number; description: string; date: string; reference: string }>,
        _userId: string,
    ) {
        const current = await this.prisma.expense.findFirst({
            where: { id, tenantId, isDeleted: false },
        });
        if (!current) throw new NotFoundException('Kayıt bulunamadı');
        const nextType = current.type;
        if (dto.categoryId) {
            await this.resolveCategory(tenantId, dto.categoryId, nextType);
        }
        const data: any = { ...dto };
        if (dto.date) data.date = new Date(dto.date);
        const row = await this.prisma.expense.update({
            where: { id },
            data,
            include: expenseIncludeCategory,
        });
        return this.toJsonExpense(row as ExpenseWithCategory);
    }

    async remove(tenantId: string, id: string, userId: string) {
        await this.findById(tenantId, id);
        await this.prisma.expense.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
        });
    }

    async getSummary(tenantId: string, options: { dateFrom: string; dateTo: string }) {
        const where: any = {
            tenantId,
            isDeleted: false,
            date: { gte: new Date(options.dateFrom), lte: new Date(options.dateTo) },
        };

        const expenses = await this.prisma.expense.findMany({
            where,
            include: expenseIncludeCategory,
        });

        const incomeTotal = expenses
            .filter((e) => e.type === ExpenseType.INCOME)
            .reduce((sum, e) => sum.add(e.amount), new Decimal(0));
        const expenseTotal = expenses
            .filter((e) => e.type === ExpenseType.EXPENSE)
            .reduce((sum, e) => sum.add(e.amount), new Decimal(0));

        const byCategory: Record<string, { income: Decimal; expense: Decimal }> = {};
        const breakdown = new Map<
            string,
            { id: string; name: string; kind: ExpenseType; income: Decimal; expense: Decimal }
        >();
        for (const e of expenses) {
            const key = e.category.name;
            if (!byCategory[key]) byCategory[key] = { income: new Decimal(0), expense: new Decimal(0) };
            if (e.type === ExpenseType.INCOME) byCategory[key].income = byCategory[key].income.add(e.amount);
            else byCategory[key].expense = byCategory[key].expense.add(e.amount);

            const cid = e.category.id;
            if (!breakdown.has(cid)) {
                breakdown.set(cid, {
                    id: cid,
                    name: e.category.name,
                    kind: e.category.kind,
                    income: new Decimal(0),
                    expense: new Decimal(0),
                });
            }
            const b = breakdown.get(cid)!;
            if (e.type === ExpenseType.INCOME) b.income = b.income.add(e.amount);
            else b.expense = b.expense.add(e.amount);
        }

        return {
            period: { from: options.dateFrom, to: options.dateTo },
            income: incomeTotal.toString(),
            expense: expenseTotal.toString(),
            net: incomeTotal.sub(expenseTotal).toString(),
            byCategory: Object.fromEntries(
                Object.entries(byCategory).map(([k, v]) => [
                    k,
                    { income: v.income.toString(), expense: v.expense.toString() },
                ]),
            ),
            categoriesBreakdown: [...breakdown.values()].map((b) => ({
                categoryId: b.id,
                name: b.name,
                kind: b.kind,
                income: b.income.toString(),
                expense: b.expense.toString(),
            })),
        };
    }

    /**
     * Kategori kartı: tarih aralığındaki kalemler ve gelir/gider toplamları (kategori türüne göre).
     */
    async categoryReport(tenantId: string, categoryId: string, dateFrom: string, dateTo: string) {
        const category = await this.prisma.expenseCategory.findFirst({
            where: { id: categoryId, tenantId, isActive: true },
        });
        if (!category) throw new NotFoundException('Kategori bulunamadı');

        const where = {
            tenantId,
            categoryId,
            isDeleted: false,
            date: { gte: new Date(dateFrom), lte: new Date(dateTo) },
        };

        const lines = await this.prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
            include: expenseIncludeCategory,
        });

        let income = new Decimal(0);
        let expense = new Decimal(0);
        for (const e of lines) {
            if (e.type === ExpenseType.INCOME) income = income.add(e.amount);
            else expense = expense.add(e.amount);
        }

        return {
            category: { id: category.id, name: category.name, kind: category.kind },
            period: { from: dateFrom, to: dateTo },
            totals: { income: income.toString(), expense: expense.toString() },
            lines: lines.map((e) => this.toJsonExpense(e as ExpenseWithCategory)),
        };
    }
}
