import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSizeSetDto, UpdateSizeSetDto } from './dto/catalog.dto';

@Injectable()
export class CatalogSizeSetService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.sizeSet.findMany({
      where: { tenantId },
      orderBy: [{ name: 'asc' }],
    });
  }

  async create(tenantId: string, dto: CreateSizeSetDto) {
    const name = dto.name.trim();
    const sizes = this.normalizeSizes(dto.sizes);
    if (sizes.length === 0) {
      throw new BadRequestException('En az bir beden girin');
    }

    const dup = await this.prisma.sizeSet.findFirst({
      where: { tenantId, name, isDeleted: false },
    });
    if (dup) {
      throw new BadRequestException('Bu isimde beden seti zaten var');
    }

    return this.prisma.sizeSet.create({
      data: { tenantId, name, sizes },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateSizeSetDto) {
    const existing = await this.ensureSet(tenantId, id);

    const name = dto.name !== undefined ? dto.name.trim() : existing.name;
    if (dto.name !== undefined && dto.name.trim() !== existing.name) {
      const dup = await this.prisma.sizeSet.findFirst({
        where: {
          tenantId,
          name,
          isDeleted: false,
          NOT: { id },
        },
      });
      if (dup) {
        throw new BadRequestException('Bu isimde beden seti zaten var');
      }
    }

    const sizes = dto.sizes !== undefined ? this.normalizeSizes(dto.sizes) : undefined;
    if (sizes && sizes.length === 0) {
      throw new BadRequestException('En az bir beden girin');
    }

    return this.prisma.sizeSet.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? name : undefined,
        sizes,
        isActive: dto.isActive,
      },
    });
  }

  async remove(tenantId: string, id: string, userId: string) {
    const row = await this.ensureSet(tenantId, id);
    const sizesRaw = (row.sizes as unknown) ?? [];
    if (Array.isArray(sizesRaw) && sizesRaw.length > 0) {
      const or: Array<{ size?: object; sizeCode?: object }> = [];
      const seen = new Set<string>();
      for (const s of sizesRaw) {
        const label = this.normalizeSizeLabel(String(s));
        if (!label) continue;
        const code = this.normalizeSizeCode(label);
        const key = `${label.toLowerCase()}\0${code}`;
        if (seen.has(key)) continue;
        seen.add(key);
        or.push({ size: { equals: label, mode: 'insensitive' } });
        or.push({ sizeCode: { equals: code, mode: 'insensitive' } });
      }
      if (or.length > 0) {
        const linked = await this.prisma.productVariant.count({
          where: { tenantId, isDeleted: false, OR: or },
        });
        if (linked > 0) {
          throw new BadRequestException(
            'Bu beden setindeki bedenlere bağlı ürün varyantları varken silinemez',
          );
        }
      }
    }

    return this.prisma.sizeSet.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
    });
  }

  private normalizeSizes(raw: string[]): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const s of raw) {
      const t = s.trim();
      if (!t) continue;
      const k = t.toUpperCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  }

  /** Match ProductService variant `size` field. */
  private normalizeSizeLabel(input: string): string {
    return String(input ?? '').trim();
  }

  /** Match ProductService variant `sizeCode` field (2-char padded). */
  private normalizeSizeCode(input: string): string {
    const cleaned = String(input ?? '')
      .replace(/\s+/g, '')
      .toUpperCase();
    return cleaned.slice(0, 2).padEnd(2, '0');
  }

  private async ensureSet(tenantId: string, id: string) {
    const row = await this.prisma.sizeSet.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Beden seti bulunamadı');
    return row;
  }
}
