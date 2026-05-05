import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseService } from './expense.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('ExpenseService', () => {
    let service: ExpenseService;
    let prisma: any;

    const mockTenantId = '11111111-1111-1111-1111-111111111111';

    beforeEach(async () => {
        prisma = {
            expense: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [ExpenseService, { provide: PrismaService, useValue: prisma }],
        }).compile();

        service = module.get<ExpenseService>(ExpenseService);
    });

    describe('getSummary', () => {
        it('should calculate net income correctly', async () => {
            const mockExpenses = [
                { type: 'INCOME', category: 'Satış', amount: new Decimal(5000) },
                { type: 'INCOME', category: 'Kira Geliri', amount: new Decimal(3000) },
                { type: 'EXPENSE', category: 'Kira', amount: new Decimal(4000) },
                { type: 'EXPENSE', category: 'Elektrik', amount: new Decimal(1500) },
            ];
            prisma.expense.findMany.mockResolvedValue(mockExpenses);

            const result = await service.getSummary(mockTenantId, { dateFrom: '2026-01-01', dateTo: '2026-01-31' });

            expect(result.income).toBe('8000');
            expect(result.expense).toBe('5500');
            expect(result.net).toBe('2500');
        });

        it('should break down by category', async () => {
            const mockExpenses = [
                { type: 'INCOME', category: 'Satış', amount: new Decimal(5000) },
                { type: 'EXPENSE', category: 'Kira', amount: new Decimal(4000) },
            ];
            prisma.expense.findMany.mockResolvedValue(mockExpenses);

            const result = await service.getSummary(mockTenantId, { dateFrom: '2026-01-01', dateTo: '2026-01-31' });

            expect(result.byCategory['Satış'].income).toBe('5000');
            expect(result.byCategory['Kira'].expense).toBe('4000');
        });

        it('should handle empty period', async () => {
            prisma.expense.findMany.mockResolvedValue([]);

            const result = await service.getSummary(mockTenantId, { dateFrom: '2026-01-01', dateTo: '2026-01-31' });

            expect(result.income).toBe('0');
            expect(result.expense).toBe('0');
            expect(result.net).toBe('0');
        });
    });
});
