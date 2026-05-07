import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/catalog.dto';

@Injectable()
export class ProductCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(tenantId: string, dto: CreateProductCategoryDto) {
    const name = dto.name.trim();
    if (dto.parentId) {
      await this.ensureCategory(tenantId, dto.parentId);
    }

    await this.ensureUniqueName(tenantId, dto.parentId ?? null, name);

    const siblings = await this.prisma.productCategory.count({
      where: { tenantId, parentId: dto.parentId ?? null },
    });

    return this.prisma.productCategory.create({
      data: {
        tenantId,
        parentId: dto.parentId ?? null,
        name,
        sortOrder: siblings,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateProductCategoryDto) {
    const existing = await this.ensureCategory(tenantId, id);

    const nextParentId = dto.parentId !== undefined ? dto.parentId : existing.parentId;

    if (dto.parentId !== undefined && dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Kategori kendisinin altı olamaz');
      }
      await this.ensureCategory(tenantId, dto.parentId);
      const under = await this.isUnder(tenantId, id, dto.parentId);
      if (under) {
        throw new BadRequestException('Alt kategorinizi üst kategori yapamazsınız');
      }
    }

    if (dto.name !== undefined) {
      await this.ensureUniqueName(tenantId, nextParentId ?? null, dto.name.trim(), id);
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        parentId: dto.parentId !== undefined ? dto.parentId : undefined,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async remove(tenantId: string, id: string, userId: string) {
    const row = await this.ensureCategory(tenantId, id);

    const childCount = await this.prisma.productCategory.count({
      where: { tenantId, parentId: id },
    });
    if (childCount > 0) {
      throw new BadRequestException('Alt kategoriler varken silinemez');
    }

    const productLinked = await this.prisma.product.count({
      where: {
        tenantId,
        isDeleted: false,
        OR: [
          { category: { equals: row.name, mode: 'insensitive' } },
          { subcategory: { equals: row.name, mode: 'insensitive' } },
        ],
      },
    });
    if (productLinked > 0) {
      throw new BadRequestException(
        'Bu kategori veya alt kategori adıyla eşleşen ürünler varken silinemez',
      );
    }

    return this.prisma.productCategory.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
    });
  }

  private async ensureCategory(tenantId: string, id: string) {
    const row = await this.prisma.productCategory.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Kategori bulunamadı');
    return row;
  }

  private async ensureUniqueName(
    tenantId: string,
    parentId: string | null,
    name: string,
    excludeId?: string,
  ) {
    const dup = await this.prisma.productCategory.findFirst({
      where: {
        tenantId,
        parentId,
        name,
        isDeleted: false,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (dup) {
      throw new BadRequestException('Bu seviyede aynı isimde kategori zaten var');
    }
  }

  /** True if `nodeId` is `ancestorId` or a descendant of `ancestorId`. */
  private async isUnder(tenantId: string, ancestorId: string, nodeId: string): Promise<boolean> {
    let current: string | null = nodeId;
    const visited = new Set<string>();
    while (current) {
      if (current === ancestorId) return true;
      if (visited.has(current)) break;
      visited.add(current);
      const row: { parentId: string | null } | null = await this.prisma.productCategory.findFirst({
        where: { id: current, tenantId },
        select: { parentId: true },
      });
      current = row?.parentId ?? null;
    }
    return false;
  }
}
