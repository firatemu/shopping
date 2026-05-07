import { Test, TestingModule } from '@nestjs/testing';
import { CampaignService } from './campaign.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CampaignService', () => {
  let service: CampaignService;
  let prisma: any;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    prisma = {
      campaign: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      giftVoucher: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      orderItem: {
        groupBy: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _count: 0, _sum: { discountAmount: null } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CampaignService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  describe('calculateDiscounts', () => {
    const cartItems = [
      {
        barcode: 'BC001',
        quantity: 3,
        unitPrice: 100,
        category: 'Üst Giyim',
        brand: 'TextileBrand',
      },
    ];

    it('should apply PERCENTAGE discount', async () => {
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Campaign1',
          type: 'PERCENTAGE',
          priority: 80,
          isActive: true,
          rules: { discountPercent: 20, categories: ['Üst Giyim'], brands: [] },
          startDate: new Date('2020-01-01'),
          endDate: new Date('2030-12-31'),
        },
      ]);

      const result = await service.calculateDiscounts(mockTenantId, cartItems);
      expect(result.totalDiscount).toBe(60); // 300 * 20%
      expect(result.cartTotal).toBe(300);
    });

    it('should apply FIXED_AMOUNT discount', async () => {
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Campaign1',
          type: 'FIXED_AMOUNT',
          priority: 80,
          isActive: true,
          rules: { discountAmount: 25, categories: ['Üst Giyim'], brands: [] },
          startDate: new Date('2020-01-01'),
          endDate: new Date('2030-12-31'),
        },
      ]);

      const result = await service.calculateDiscounts(mockTenantId, cartItems);
      expect(result.totalDiscount).toBe(25);
    });

    it('should apply X_FOR_Y (3 al 2 öde)', async () => {
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Campaign1',
          type: 'X_FOR_Y',
          priority: 90,
          isActive: true,
          rules: { buyQuantity: 2, getQuantity: 1, categories: [], brands: ['TextileBrand'] },
          startDate: new Date('2020-01-01'),
          endDate: new Date('2030-12-31'),
        },
      ]);

      const result = await service.calculateDiscounts(mockTenantId, cartItems);
      expect(result.totalDiscount).toBe(100); // 1 free @ 100
    });

    it('should return zero when no campaigns match', async () => {
      prisma.campaign.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Campaign1',
          type: 'PERCENTAGE',
          priority: 80,
          isActive: true,
          rules: { discountPercent: 20, categories: ['Alt Giyim'], brands: [] },
          startDate: new Date('2020-01-01'),
          endDate: new Date('2030-12-31'),
        },
      ]);

      const result = await service.calculateDiscounts(mockTenantId, cartItems);
      expect(result.totalDiscount).toBe(0);
    });

    it('should handle no active campaigns', async () => {
      prisma.campaign.findMany.mockResolvedValue([]);

      const result = await service.calculateDiscounts(mockTenantId, cartItems);
      expect(result.totalDiscount).toBe(0);
      expect(result.campaigns).toHaveLength(0);
    });
  });
});
