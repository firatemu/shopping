import { Test, TestingModule } from '@nestjs/testing';
import { CustomerService } from './customer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

describe('CustomerService', () => {
    let service: CustomerService;
    let prisma: any;

    const mockTenantId = '11111111-1111-1111-1111-111111111111';
    const mockUserId = '22222222-2222-2222-2222-222222222222';
    const mockCustomerId = '33333333-3333-3333-3333-333333333333';

    const mockCustomer = {
        id: mockCustomerId,
        tenantId: mockTenantId,
        name: 'Ahmet',
        surname: 'Yılmaz',
        companyName: 'Yılmaz Tekstil',
        taxId: '1234567890',
        phone: '+905551234567',
        email: 'ahmet@test.com',
        creditLimit: new Decimal(10000),
        currentBalance: new Decimal(2500),
        creditLimitAction: 'WARN',
        isDeleted: false,
        isActive: true,
    };

    beforeEach(async () => {
        prisma = {
            customer: {
                create: jest.fn(),
                findFirst: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
                update: jest.fn(),
            },
            ledgerMovement: {
                create: jest.fn(),
                findMany: jest.fn(),
                count: jest.fn(),
            },
            auditLog: { create: jest.fn() },
            executeTransaction: jest.fn((fn) => fn(prisma)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomerService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<CustomerService>(CustomerService);
    });

    describe('create', () => {
        it('should create a customer with default credit limit', async () => {
            const dto = { name: 'Mehmet', surname: 'Kaya' };
            const created = { id: 'new-id', tenantId: mockTenantId, ...dto, creditLimit: 0, creditLimitAction: 'WARN' };
            prisma.customer.create.mockResolvedValue(created);
            prisma.auditLog.create.mockResolvedValue({});

            const result = await service.create(mockTenantId, dto, mockUserId);
            expect(result.name).toBe('Mehmet');
            expect(prisma.customer.create).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ tenantId: mockTenantId, name: 'Mehmet' }) }),
            );
        });
    });

    describe('findById', () => {
        it('should return customer when found', async () => {
            prisma.customer.findFirst.mockResolvedValue(mockCustomer);
            const result = await service.findById(mockTenantId, mockCustomerId);
            expect(result.name).toBe('Ahmet');
        });

        it('should throw NotFoundException when not found', async () => {
            prisma.customer.findFirst.mockResolvedValue(null);
            await expect(service.findById(mockTenantId, 'nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('recordPayment', () => {
        it('should deduct payment from customer balance', async () => {
            prisma.customer.findFirst.mockResolvedValue(mockCustomer);
            prisma.customer.update.mockResolvedValue({ ...mockCustomer, currentBalance: new Decimal(2000) });
            prisma.ledgerMovement.create.mockResolvedValue({ id: 'mov-1', balanceAfter: new Decimal(2000) });
            prisma.auditLog.create.mockResolvedValue({});

            const result = await service.recordPayment(mockTenantId, {
                customerId: mockCustomerId,
                method: 'PAYMENT_CASH' as any,
                amount: 500,
            }, mockUserId);

            expect(prisma.customer.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ currentBalance: expect.any(Decimal) }),
                }),
            );
            expect(result.newBalance.toNumber()).toBe(2000);
        });

        it('should throw if customer not found', async () => {
            prisma.customer.findFirst.mockResolvedValue(null);
            await expect(
                service.recordPayment(mockTenantId, { customerId: 'bad', method: 'PAYMENT_CASH' as any, amount: 100 }, mockUserId),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('findAll', () => {
        it('should paginate and search', async () => {
            prisma.customer.findMany.mockResolvedValue([mockCustomer]);
            prisma.customer.count.mockResolvedValue(1);

            const result = await service.findAll(mockTenantId, { page: 1, limit: 20, search: 'Ahmet' });
            expect(result.data).toHaveLength(1);
            expect(result.meta.total).toBe(1);
        });
    });

    describe('getOverdueCustomers', () => {
        it('should return customers with positive balance', async () => {
            const overdueCustomer = { ...mockCustomer, currentBalance: new Decimal(5000) };
            prisma.customer.findMany.mockResolvedValue([overdueCustomer]);

            const result = await service.getOverdueCustomers(mockTenantId);
            expect(result.totalOverdue).toBe(1);
            expect(result.customers[0].overCreditLimit).toBe(false); // 5000 < 10000
        });

        it('should flag over-credit-limit customers', async () => {
            const overLimit = { ...mockCustomer, currentBalance: new Decimal(15000), creditLimit: new Decimal(10000) };
            prisma.customer.findMany.mockResolvedValue([overLimit]);

            const result = await service.getOverdueCustomers(mockTenantId);
            expect(result.customers[0].overCreditLimit).toBe(true);
        });
    });
});
