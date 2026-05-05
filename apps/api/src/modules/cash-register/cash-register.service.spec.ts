import { Test, TestingModule } from '@nestjs/testing';
import { CashRegisterService } from './cash-register.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('CashRegisterService', () => {
    let service: CashRegisterService;
    let prisma: any;

    const mockTenantId = '11111111-1111-1111-1111-111111111111';
    const mockCashierId = '22222222-2222-2222-2222-222222222222';
    const mockSessionId = '33333333-3333-3333-3333-333333333333';

    const mockOpenSession = {
        id: mockSessionId,
        tenantId: mockTenantId,
        cashierId: mockCashierId,
        openingBalance: new Decimal(1000),
        totalCash: new Decimal(5000),
        totalCard: new Decimal(3000),
        totalTransfer: new Decimal(500),
        status: 'OPEN',
    };

    beforeEach(async () => {
        prisma = {
            cashRegisterSession: {
                create: jest.fn(),
                findFirst: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
                update: jest.fn(),
            },
            cashRegisterAdjustment: { create: jest.fn() },
            auditLog: { create: jest.fn() },
            executeTransaction: jest.fn((fn: (p: any) => any) => fn(prisma)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CashRegisterService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CashRegisterService>(CashRegisterService);
    });

    describe('openSession', () => {
        it('should open a new session', async () => {
            prisma.cashRegisterSession.findFirst.mockResolvedValue(null);
            prisma.cashRegisterSession.create.mockResolvedValue({ ...mockOpenSession, totalCash: new Decimal(0) });

            const result = await service.openSession(mockTenantId, mockCashierId, { openingBalance: 1000 });
            expect(result.status).toBe('OPEN');
        });

        it('should reject if session already open', async () => {
            prisma.cashRegisterSession.findFirst.mockResolvedValue(mockOpenSession);
            await expect(service.openSession(mockTenantId, mockCashierId, { openingBalance: 1000 })).rejects.toThrow(BadRequestException);
        });
    });

    describe('closeSession', () => {
        it('should close and calculate difference', async () => {
            prisma.cashRegisterSession.findFirst.mockResolvedValue(mockOpenSession);
            prisma.cashRegisterSession.update.mockResolvedValue({
                ...mockOpenSession,
                status: 'CLOSED',
                closingBalance: new Decimal(6000),
                physicalCount: new Decimal(5950),
                difference: new Decimal(-50),
            });
            prisma.auditLog.create.mockResolvedValue({});

            const result = await service.closeSession(mockTenantId, mockSessionId, mockCashierId, {
                physicalCount: 5950,
            });

            expect(result.status).toBe('CLOSED');
            expect(result.difference?.toNumber()).toBe(-50);
        });

        it('should throw if session not found', async () => {
            prisma.cashRegisterSession.findFirst.mockResolvedValue(null);
            await expect(
                service.closeSession(mockTenantId, 'bad', mockCashierId, { physicalCount: 0 }),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('createAdjustment', () => {
        it('should allow adjustment on closed session', async () => {
            const closedSession = { ...mockOpenSession, status: 'CLOSED' };
            prisma.cashRegisterSession.findFirst.mockResolvedValue(closedSession);
            prisma.cashRegisterAdjustment.create.mockResolvedValue({ id: 'adj-1', amount: new Decimal(50) });
            prisma.cashRegisterSession.update.mockResolvedValue({ ...closedSession, status: 'ADJUSTED' });

            const result = await service.createAdjustment(mockTenantId, mockSessionId, 50, 'Sayım farkı', mockCashierId);
            expect(result.amount.toNumber()).toBe(50);
        });

        it('should reject if not CLOSED', async () => {
            prisma.cashRegisterSession.findFirst.mockResolvedValue(null);
            await expect(service.createAdjustment(mockTenantId, mockSessionId, 50, 'test', mockCashierId)).rejects.toThrow(NotFoundException);
        });
    });
});
