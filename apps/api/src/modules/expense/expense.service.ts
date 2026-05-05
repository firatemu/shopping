import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ExpenseService {
    private readonly logger = new Logger(ExpenseService.name);

    constructor(private readonly prisma: PrismaService) { }

    async create(tenantId: string, dto: { type: string; category: string; amount: number; description?: string; date?: string; isRecurring?: boolean; recurringDay?: number; reference?: string }, userId: string) {
        const expense = await this.prisma.expense.create({
            data: {
                tenantId,
                type: dto.type as any,
                category: dto.category,
                amount: dto.amount,
                description: dto.description,
                date: dto.date ? new Date(dto.date) : new Date(),
                isRecurring: dto.isRecurring ?? false,
                recurringDay: dto.recurringDay,
                reference: dto.reference,
                createdBy: userId,
            },
        });
        this.logger.log(`[tenantId=${tenantId}] ${dto.type} created: ${dto.category} — ${dto.amount}`);
        return expense;
    }

    async findAll(
        tenantId: string,
        options: {
            page?: number;
            limit?: number;
            type?: string;
            category?: string;
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
        if (options.category) where.category = options.category;
        if (options.dateFrom || options.dateTo) {
            where.date = {};
            if (options.dateFrom) where.date.gte = new Date(options.dateFrom);
            if (options.dateTo) where.date.lte = new Date(options.dateTo);
        }
        const s = options.search?.trim();
        if (s) {
            where.OR = [
                { category: { contains: s, mode: 'insensitive' as const } },
                { description: { contains: s, mode: 'insensitive' as const } },
                { reference: { contains: s, mode: 'insensitive' as const } },
            ];
        }

        const [expenses, total] = await Promise.all([
            this.prisma.expense.findMany({ where, orderBy: { date: 'desc' }, skip, take: limit }),
            this.prisma.expense.count({ where }),
        ]);

        return { data: expenses, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findById(tenantId: string, id: string) {
        const expense = await this.prisma.expense.findFirst({ where: { id, tenantId, isDeleted: false } });
        if (!expense) throw new NotFoundException('Kayıt bulunamadı');
        return expense;
    }

    async update(tenantId: string, id: string, dto: Partial<{ category: string; amount: number; description: string; date: string; reference: string }>, _userId: string) {
        await this.findById(tenantId, id);
        const data: any = { ...dto };
        if (dto.date) data.date = new Date(dto.date);
        return this.prisma.expense.update({ where: { id }, data });
    }

    async remove(tenantId: string, id: string, userId: string) {
        await this.findById(tenantId, id);
        await this.prisma.expense.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } });
    }

    async getSummary(tenantId: string, options: { dateFrom: string; dateTo: string }) {
        const where: any = { tenantId, isDeleted: false, date: { gte: new Date(options.dateFrom), lte: new Date(options.dateTo) } };

        const expenses = await this.prisma.expense.findMany({ where });

        const incomeTotal = expenses.filter((e) => e.type === 'INCOME').reduce((sum, e) => sum.add(e.amount), new Decimal(0));
        const expenseTotal = expenses.filter((e) => e.type === 'EXPENSE').reduce((sum, e) => sum.add(e.amount), new Decimal(0));

        const byCategory: Record<string, { income: Decimal; expense: Decimal }> = {};
        for (const e of expenses) {
            if (!byCategory[e.category]) byCategory[e.category] = { income: new Decimal(0), expense: new Decimal(0) };
            if (e.type === 'INCOME') byCategory[e.category].income = byCategory[e.category].income.add(e.amount);
            else byCategory[e.category].expense = byCategory[e.category].expense.add(e.amount);
        }

        return {
            period: { from: options.dateFrom, to: options.dateTo },
            income: incomeTotal.toString(),
            expense: expenseTotal.toString(),
            net: incomeTotal.sub(expenseTotal).toString(),
            byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, { income: v.income.toString(), expense: v.expense.toString() }])),
        };
    }
}
