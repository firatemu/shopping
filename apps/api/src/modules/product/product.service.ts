import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProductDto,
  CreateVariantDto,
  UpdateProductDto,
  BulkCreateVariantsDto,
} from './dto/product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create product with optional variants (auto-generates barcodes).
   */
  async create(tenantId: string, dto: CreateProductDto, userId: string) {
    return this.prisma.executeTransaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          brand: dto.brand,
          category: dto.category,
          subcategory: dto.subcategory,
          season: dto.season,
          gender: dto.gender,
          supplierCode: dto.supplierCode,
          supplierId: dto.supplierId,
          costPrice: dto.costPrice,
          salePrice: dto.salePrice,
          kdvRate: dto.kdvRate,
          imageUrl: dto.imageUrl,
        },
      });

      // Create variants if provided
      if (dto.variants && dto.variants.length > 0) {
        const tenantCode = await this.getTenantCode(tx, tenantId);
        const productSeq = await this.getNextProductSequence(tx, tenantId);

        for (const variant of dto.variants) {
          const barcode = variant.barcode?.trim()
            ? variant.barcode.trim()
            : this.generateBarcode(tenantCode, productSeq, variant.colorCode, variant.sizeCode);

          await tx.productVariant.create({
            data: {
              tenantId,
              productId: product.id,
              barcode,
              color: variant.color,
              colorCode: variant.colorCode,
              size: variant.size,
              sizeCode: variant.sizeCode,
              stockQuantity: variant.stockQuantity ?? 0,
              minStockLevel: variant.minStockLevel ?? 5,
              costPrice: variant.costPrice,
              salePrice: variant.salePrice,
            },
          });
        }
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'Product',
          entityId: product.id,
          action: 'CREATE',
          newValue: product as any,
        },
      });

      this.logger.log(`[tenantId=${tenantId}] Product created: ${product.id}`);

      return product;
    });
  }

  /**
   * Get all products for tenant with pagination.
   */
  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      brand?: string;
      search?: string;
    },
  ) {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    this.logger.warn(`findAll: page=${page}, limit=${limit}, skip=${skip}`);

    const where: any = {
      tenantId,
      isDeleted: false,
    };

    if (options.category) where.category = options.category;
    if (options.brand) where.brand = options.brand;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { brand: { contains: options.search, mode: 'insensitive' } },
        { category: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          variants: {
            where: { isDeleted: false },
            orderBy: [{ color: 'asc' }, { size: 'asc' }],
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Paginated flat list of variants (for variation management UI).
   */
  async findAllVariants(
    tenantId: string,
    options: { page?: number; limit?: number; search?: string },
  ) {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 50, 100);
    const skip = (page - 1) * limit;
    const search = options.search?.trim();

    const variantWhere: Prisma.ProductVariantWhereInput = {
      tenantId,
      isDeleted: false,
    };

    if (search) {
      variantWhere.OR = [
        { barcode: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { size: { contains: search, mode: 'insensitive' } },
        { colorCode: { contains: search, mode: 'insensitive' } },
        { sizeCode: { contains: search, mode: 'insensitive' } },
        {
          product: {
            is: {
              tenantId,
              isDeleted: false,
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { subcategory: { contains: search, mode: 'insensitive' } },
                { supplierCode: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    } else {
      variantWhere.product = { is: { tenantId, isDeleted: false } };
    }

    const [variants, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: variantWhere,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              brand: true,
              category: true,
              subcategory: true,
              supplierCode: true,
              salePrice: true,
              costPrice: true,
              kdvRate: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.productVariant.count({ where: variantWhere }),
    ]);

    return {
      data: variants.map((v) => {
        const sale = v.salePrice ?? v.product.salePrice;
        const cost = v.costPrice ?? v.product.costPrice;
        return {
          id: v.id,
          barcode: v.barcode,
          color: v.color,
          colorCode: v.colorCode,
          size: v.size,
          sizeCode: v.sizeCode,
          stockQuantity: v.stockQuantity,
          reservedQty: v.reservedQty,
          isActive: v.isActive,
          effectiveSalePrice: sale.toString(),
          effectiveCostPrice: cost.toString(),
          kdvRate: v.product.kdvRate.toString(),
          product: {
            id: v.product.id,
            name: v.product.name,
            description: v.product.description,
            brand: v.product.brand,
            category: v.product.category,
            subcategory: v.product.subcategory,
            supplierCode: v.product.supplierCode,
            salePrice: v.product.salePrice.toString(),
            costPrice: v.product.costPrice.toString(),
            kdvRate: v.product.kdvRate.toString(),
          },
        };
      }),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  /**
   * Get product by ID with all variants.
   */
  async findById(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, isDeleted: false },
      include: {
        variants: {
          where: { isDeleted: false },
          orderBy: [{ color: 'asc' }, { size: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Ürün bulunamadı');
    }

    return product;
  }

  /**
   * Update product (does NOT update variants).
   */
  async update(tenantId: string, id: string, dto: UpdateProductDto, userId: string) {
    const existing = await this.findById(tenantId, id);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        costPrice: dto.costPrice !== undefined ? dto.costPrice : undefined,
        salePrice: dto.salePrice !== undefined ? dto.salePrice : undefined,
        kdvRate: dto.kdvRate !== undefined ? dto.kdvRate : undefined,
      },
      include: {
        variants: {
          where: { isDeleted: false },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Product',
        entityId: id,
        action: 'UPDATE',
        oldValue: existing as any,
        newValue: updated as any,
      },
    });

    return updated;
  }

  /**
   * Soft delete a product and all its variants.
   */
  async remove(tenantId: string, id: string, userId: string) {
    await this.findById(tenantId, id);

    await this.prisma.executeTransaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
      });

      await tx.productVariant.updateMany({
        where: { productId: id, tenantId },
        data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'Product',
          entityId: id,
          action: 'DELETE',
        },
      });
    });

    this.logger.log(`[tenantId=${tenantId}] Product soft-deleted: ${id}`);
  }

  /**
   * Add a new variant to an existing product.
   */
  async addVariant(tenantId: string, productId: string, dto: CreateVariantDto, userId: string) {
    await this.findById(tenantId, productId);

    return this.prisma.executeTransaction(async (tx) => {
      const tenantCode = await this.getTenantCode(tx, tenantId);
      const productSeq = await this.getNextProductSequence(tx, tenantId);
      const barcode = this.generateBarcode(tenantCode, productSeq, dto.colorCode, dto.sizeCode);

      const variant = await tx.productVariant.create({
        data: {
          tenantId,
          productId,
          barcode,
          color: dto.color,
          colorCode: dto.colorCode,
          size: dto.size,
          sizeCode: dto.sizeCode,
          stockQuantity: dto.stockQuantity ?? 0,
          minStockLevel: dto.minStockLevel ?? 5,
          costPrice: dto.costPrice,
          salePrice: dto.salePrice,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'ProductVariant',
          entityId: variant.id,
          action: 'CREATE',
          newValue: variant as any,
        },
      });

      return variant;
    });
  }

  private normalizeColorCode(input: string): string {
    return input.replace(/\s+/g, '').toUpperCase().slice(0, 3).padEnd(3, '0');
  }

  private normalizeSizeLabel(input: string): string {
    return String(input ?? '').trim();
  }

  private normalizeSizeCode(input: string): string {
    const cleaned = String(input ?? '')
      .replace(/\s+/g, '')
      .toUpperCase();
    return cleaned.slice(0, 2).padEnd(2, '0');
  }

  /**
   * Bulk-create variants for a product: selected colors × sizeset sizes.
   * Stock is specified per size label; missing labels default to 1.
   */
  async bulkCreateVariants(
    tenantId: string,
    productId: string,
    dto: BulkCreateVariantsDto,
    userId: string,
  ) {
    await this.findById(tenantId, productId);

    return this.prisma.executeTransaction(async (tx) => {
      const [colors, sizeSet, existing] = await Promise.all([
        tx.productColor.findMany({
          where: { tenantId, id: { in: dto.colorIds }, isDeleted: false, isActive: true },
        }),
        tx.sizeSet.findFirst({
          where: { tenantId, id: dto.sizeSetId, isDeleted: false, isActive: true },
        }),
        tx.productVariant.findMany({
          where: { tenantId, productId, isDeleted: false },
          select: { id: true, colorCode: true, sizeCode: true, color: true, size: true },
        }),
      ]);

      if (!sizeSet) throw new NotFoundException('Beden seti bulunamadı');
      if (colors.length === 0) throw new BadRequestException('En az bir renk seçin');

      const sizesRaw = (sizeSet.sizes as unknown) ?? [];
      if (!Array.isArray(sizesRaw) || sizesRaw.length === 0) {
        throw new BadRequestException('Beden seti boş olamaz');
      }
      const sizes = sizesRaw.map((s) => this.normalizeSizeLabel(String(s))).filter(Boolean);
      if (sizes.length === 0) throw new BadRequestException('Beden seti boş olamaz');

      const existingKeySet = new Set(
        existing.map(
          (v) => `${this.normalizeColorCode(v.colorCode)}|${this.normalizeSizeCode(v.sizeCode)}`,
        ),
      );

      const stockBySize = dto.stockBySize ?? {};
      const createdIds: string[] = [];
      const skipped: Array<{ colorName: string; size: string; reason: string }> = [];

      const tenantCode = await this.getTenantCode(tx, tenantId);

      for (const c of colors) {
        const colorName = c.name;
        const colorCode = this.normalizeColorCode(c.code);

        for (const sizeLabel of sizes) {
          const size = sizeLabel;
          const sizeCode = this.normalizeSizeCode(sizeLabel);
          const key = `${colorCode}|${sizeCode}`;

          if (existingKeySet.has(key)) {
            skipped.push({ colorName, size, reason: 'ALREADY_EXISTS' });
            continue;
          }

          const requestedStock = stockBySize[sizeLabel];
          const qty =
            requestedStock === undefined || requestedStock === null
              ? 1
              : Number.isFinite(Number(requestedStock))
                ? Math.trunc(Number(requestedStock))
                : NaN;

          if (!Number.isFinite(qty) || qty < 0) {
            skipped.push({ colorName, size, reason: 'INVALID_STOCK' });
            continue;
          }

          const productSeq = await this.getNextProductSequence(tx, tenantId);
          const barcode = this.generateBarcode(tenantCode, productSeq, colorCode, sizeCode);

          const v = await tx.productVariant.create({
            data: {
              tenantId,
              productId,
              barcode,
              color: colorName,
              colorCode,
              size,
              sizeCode,
              stockQuantity: qty,
              minStockLevel: 5,
            },
            select: { id: true },
          });

          createdIds.push(v.id);
          existingKeySet.add(key);
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          entityType: 'ProductVariant',
          entityId: productId,
          action: 'BULK_CREATE_VARIANTS',
          newValue: { created: createdIds.length, createdIds, skipped } as any,
        },
      });

      return { created: createdIds.length, createdIds, skipped };
    });
  }

  /**
   * Barcode lookup — target <50ms p95.
   * Uses unique index on (tenantId, barcode).
   */
  async lookupBarcode(tenantId: string, barcode: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        tenantId,
        barcode,
        isDeleted: false,
      },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Barkod bulunamadı');
    }

    return {
      variant,
      product: variant.product,
      effectiveCostPrice: variant.costPrice ?? variant.product.costPrice,
      effectiveSalePrice: variant.salePrice ?? variant.product.salePrice,
      kdvRate: variant.product.kdvRate,
      availableStock: variant.stockQuantity - variant.reservedQty,
    };
  }

  /**
   * Generate barcode: [TenantCode(3)][ProductSeq(6)][ColorCode(3)][SizeCode(2)][CheckDigit(2)]
   */
  private generateBarcode(
    tenantCode: string,
    productSeq: number,
    colorCode: string,
    sizeCode: string,
  ): string {
    const base = `${tenantCode}${String(productSeq).padStart(6, '0')}${colorCode.padEnd(3, '0')}${sizeCode.padEnd(2, '0')}`;
    const checkDigit = this.calculateLuhnCheckDigit(base);
    return `${base}${checkDigit}`;
  }

  private calculateLuhnCheckDigit(input: string): string {
    const digits = input.split('').map((c) => c.charCodeAt(0) % 10);
    let sum = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits[i];
      if ((digits.length - i) % 2 === 0) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    const check1 = (10 - (sum % 10)) % 10;
    const check2 = (check1 * 3 + 7) % 10;
    return `${check1}${check2}`;
  }

  private async getTenantCode(tx: any, tenantId: string): Promise<string> {
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { code: true },
    });
    return tenant?.code ?? 'UNK';
  }

  private async getNextProductSequence(tx: any, tenantId: string): Promise<number> {
    const count = await tx.productVariant.count({
      where: { tenantId },
    });
    return count + 1;
  }
}
