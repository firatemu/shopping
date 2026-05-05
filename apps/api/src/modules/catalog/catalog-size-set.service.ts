import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSizeSetDto, UpdateSizeSetDto } from './dto/catalog.dto';

@Injectable()
export class CatalogSizeSetService {
    constructor(private readonly prisma: PrismaService) { }

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

        let name = dto.name !== undefined ? dto.name.trim() : existing.name;
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

        const sizes =
            dto.sizes !== undefined ? this.normalizeSizes(dto.sizes) : undefined;
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
        await this.ensureSet(tenantId, id);
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

    private async ensureSet(tenantId: string, id: string) {
        const row = await this.prisma.sizeSet.findFirst({
            where: { id, tenantId },
        });
        if (!row) throw new NotFoundException('Beden seti bulunamadı');
        return row;
    }
}
