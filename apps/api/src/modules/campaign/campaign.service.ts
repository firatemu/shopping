import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto, CreateGiftVoucherDto } from './dto/campaign.dto';
import { CampaignType as PrismaCampaignType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';

// Map local DTO enum to Prisma enum
const CAMPAIGN_TYPE_MAP: Record<string, PrismaCampaignType> = {
    PERCENTAGE_DISCOUNT: 'PERCENTAGE',
    FIXED_DISCOUNT: 'FIXED_AMOUNT',
    BUY_X_GET_Y: 'X_FOR_Y',
    SECOND_ITEM_PERCENT: 'SECOND_ITEM',
    FREE_GIFT: 'CATEGORY',
};

@Injectable()
export class CampaignService {
    private readonly logger = new Logger(CampaignService.name);

    constructor(private readonly prisma: PrismaService) { }

    async create(tenantId: string, dto: CreateCampaignDto, userId: string) {
        const prismaType = CAMPAIGN_TYPE_MAP[dto.type] ?? 'PERCENTAGE';

        const campaign = await this.prisma.campaign.create({
            data: {
                tenantId,
                name: dto.name,
                description: dto.description,
                type: prismaType,
                rules: {
                    discountPercent: dto.discountPercent,
                    discountAmount: dto.discountAmount,
                    buyQuantity: dto.buyQuantity,
                    getQuantity: dto.getQuantity,
                    minOrderAmount: dto.minOrderAmount,
                    categories: dto.categories ?? [],
                    brands: dto.brands ?? [],
                },
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
                isActive: dto.isActive ?? true,
            },
        });

        await this.prisma.auditLog.create({
            data: {
                tenantId,
                userId,
                entityType: 'Campaign',
                entityId: campaign.id,
                action: 'CREATE',
                newValue: campaign as any,
            },
        });

        this.logger.log(`[tenantId=${tenantId}] Campaign created: ${campaign.name}`);
        return campaign;
    }

    async findAll(tenantId: string, options: { activeOnly?: boolean; search?: string }) {
        const where: any = { tenantId, isDeleted: false };
        if (options.activeOnly) {
            where.isActive = true;
            where.startDate = { lte: new Date() };
            where.endDate = { gte: new Date() };
        }
        const q = options.search?.trim();
        if (q) {
            where.name = { contains: q, mode: 'insensitive' };
        }
        const rows = await this.prisma.campaign.findMany({ where, orderBy: { createdAt: 'desc' } });

        const usageAgg = await this.prisma.orderItem.groupBy({
            by: ['campaignId'],
            where: { tenantId, campaignId: { not: null } },
            _count: { _all: true },
            _sum: { discountAmount: true },
        });
        const usageMap = new Map<string, { count: number; discountTotal: string }>();
        for (const u of usageAgg) {
            if (!u.campaignId) continue;
            usageMap.set(u.campaignId, {
                count: u._count._all,
                discountTotal: (u._sum.discountAmount ?? new Decimal(0)).toString(),
            });
        }

        const now = new Date();
        const data = rows.map((c) => {
            const usage = usageMap.get(c.id);
            const expired = c.endDate < now;
            const started = c.startDate <= now;
            let uiStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
            if (expired) uiStatus = 'EXPIRED';
            else if (c.isActive && started) uiStatus = 'ACTIVE';
            else if (!c.isActive) uiStatus = 'INACTIVE';
            else if (!started) uiStatus = 'INACTIVE';

            return {
                ...c,
                usageCount: usage?.count ?? 0,
                totalDiscountGiven: usage?.discountTotal ?? '0',
                uiStatus,
            };
        });
        return { data };
    }

    async findById(tenantId: string, id: string) {
        const campaign = await this.prisma.campaign.findFirst({
            where: { id, tenantId, isDeleted: false },
        });
        if (!campaign) throw new NotFoundException('Kampanya bulunamadı');
        const agg = await this.prisma.orderItem.aggregate({
            where: { tenantId, campaignId: id },
            _count: true,
            _sum: { discountAmount: true },
        });
        const now = new Date();
        const expired = campaign.endDate < now;
        const started = campaign.startDate <= now;
        let uiStatus: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' = 'INACTIVE';
        if (expired) uiStatus = 'EXPIRED';
        else if (campaign.isActive && started) uiStatus = 'ACTIVE';
        else if (!campaign.isActive) uiStatus = 'INACTIVE';

        return {
            ...campaign,
            usageCount: agg._count,
            totalDiscountGiven: (agg._sum.discountAmount ?? new Decimal(0)).toString(),
            uiStatus,
        };
    }

    async update(tenantId: string, id: string, dto: UpdateCampaignDto, userId: string) {
        const existing = await this.findById(tenantId, id);
        const data: any = {};
        if (dto.name) data.name = dto.name;
        if (dto.description) data.description = dto.description;
        if (dto.discountPercent !== undefined || dto.discountAmount !== undefined || dto.minOrderAmount !== undefined) {
            const rules = existing.rules as any;
            if (dto.discountPercent !== undefined) rules.discountPercent = dto.discountPercent;
            if (dto.discountAmount !== undefined) rules.discountAmount = dto.discountAmount;
            if (dto.minOrderAmount !== undefined) rules.minOrderAmount = dto.minOrderAmount;
            data.rules = rules;
        }
        if (dto.startDate) data.startDate = new Date(dto.startDate);
        if (dto.endDate) data.endDate = new Date(dto.endDate);
        if (dto.isActive !== undefined) data.isActive = dto.isActive;

        const updated = await this.prisma.campaign.update({ where: { id }, data });
        await this.prisma.auditLog.create({
            data: { tenantId, userId, entityType: 'Campaign', entityId: id, action: 'UPDATE' },
        });
        return updated;
    }

    async remove(tenantId: string, id: string, userId: string) {
        await this.findById(tenantId, id);
        await this.prisma.campaign.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() },
        });
        await this.prisma.auditLog.create({
            data: { tenantId, userId, entityType: 'Campaign', entityId: id, action: 'DELETE' },
        });
    }

    /**
     * Calculate applicable discounts for a cart.
     */
    async calculateDiscounts(
        tenantId: string,
        cartItems: Array<{ barcode: string; quantity: number; unitPrice: number; category?: string; brand?: string }>,
    ) {
        const activeCampaigns = await this.findAll(tenantId, { activeOnly: true });
        const applicableDiscounts: Array<{ campaignId: string; campaignName: string; type: string; discountAmount: number }> = [];
        const cartTotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

        for (const campaign of activeCampaigns.data) {
            const rules = campaign.rules as any;
            if (rules.minOrderAmount && cartTotal < rules.minOrderAmount) continue;

            const matchingItems = cartItems.filter((item) => {
                if (rules.categories?.length > 0 && !rules.categories.includes(item.category)) return false;
                if (rules.brands?.length > 0 && !rules.brands.includes(item.brand)) return false;
                return true;
            });
            if (matchingItems.length === 0) continue;

            const matchingTotal = matchingItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

            switch (campaign.type as string) {
                case 'PERCENTAGE':
                    if (rules.discountPercent) {
                        applicableDiscounts.push({
                            campaignId: campaign.id, campaignName: campaign.name, type: campaign.type,
                            discountAmount: (matchingTotal * rules.discountPercent) / 100,
                        });
                    }
                    break;
                case 'FIXED_AMOUNT':
                    if (rules.discountAmount) {
                        applicableDiscounts.push({
                            campaignId: campaign.id, campaignName: campaign.name, type: campaign.type,
                            discountAmount: Math.min(rules.discountAmount, matchingTotal),
                        });
                    }
                    break;
                case 'X_FOR_Y': {
                    const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                    const buyX = rules.buyQuantity ?? 3;
                    const getY = rules.getQuantity ?? 1;
                    const sets = Math.floor(totalQty / (buyX + getY));
                    if (sets > 0) {
                        const cheapest = Math.min(...matchingItems.map((i) => i.unitPrice));
                        applicableDiscounts.push({
                            campaignId: campaign.id, campaignName: campaign.name, type: campaign.type,
                            discountAmount: sets * getY * cheapest,
                        });
                    }
                    break;
                }
                case 'SECOND_ITEM': {
                    if (rules.discountPercent) {
                        const totalQty = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
                        if (totalQty >= 2) {
                            const secondCount = Math.floor(totalQty / 2);
                            const cheapest = Math.min(...matchingItems.map((i) => i.unitPrice));
                            applicableDiscounts.push({
                                campaignId: campaign.id, campaignName: campaign.name, type: campaign.type,
                                discountAmount: (secondCount * cheapest * rules.discountPercent) / 100,
                            });
                        }
                    }
                    break;
                }
            }
        }

        return {
            cartTotal,
            totalDiscount: applicableDiscounts.reduce((sum, d) => sum + d.discountAmount, 0),
            campaigns: applicableDiscounts,
        };
    }

    // ========================================
    // GIFT VOUCHER MANAGEMENT
    // ========================================

    async createGiftVoucher(tenantId: string, dto: CreateGiftVoucherDto, userId: string) {
        const code = `GV-${uuidv4().substring(0, 8).toUpperCase()}`;
        const voucher = await this.prisma.giftVoucher.create({
            data: {
                tenantId,
                code,
                initialBalance: dto.amount,
                currentBalance: dto.amount,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                createdBy: userId,
            },
        });
        this.logger.log(`[tenantId=${tenantId}] Gift voucher created: ${code} — amount: ${dto.amount}`);
        return voucher;
    }

    async lookupVoucher(tenantId: string, code: string) {
        const voucher = await this.prisma.giftVoucher.findFirst({
            where: { tenantId, code, status: 'ACTIVE' },
        });
        if (!voucher) throw new NotFoundException('Hediye çeki bulunamadı');
        if (voucher.expiresAt && voucher.expiresAt < new Date()) {
            throw new NotFoundException('Hediye çeki süresi dolmuş');
        }
        return voucher;
    }

    async listVouchers(tenantId: string, options: { page?: number; limit?: number }) {
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const [vouchers, total] = await Promise.all([
            this.prisma.giftVoucher.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            this.prisma.giftVoucher.count({ where: { tenantId } }),
        ]);

        return { data: vouchers, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
}
