import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductColorDto, UpdateProductColorDto } from './dto/catalog.dto';

@Injectable()
export class ProductColorService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.productColor.findMany({
            where: { tenantId },
            orderBy: [{ name: 'asc' }],
        });
    }

    async create(tenantId: string, dto: CreateProductColorDto) {
        const name = dto.name.trim();
        const code = dto.code.trim().toUpperCase();
        await this.ensureCodeFree(tenantId, code);

        return this.prisma.productColor.create({
            data: { tenantId, name, code },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateProductColorDto) {
        await this.ensureColor(tenantId, id);

        const code = dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined;
        if (code) {
            await this.ensureCodeFree(tenantId, code, id);
        }

        return this.prisma.productColor.update({
            where: { id },
            data: {
                name: dto.name !== undefined ? dto.name.trim() : undefined,
                code,
                isActive: dto.isActive,
            },
        });
    }

    async remove(tenantId: string, id: string, userId: string) {
        await this.ensureColor(tenantId, id);
        return this.prisma.productColor.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
        });
    }

    private async ensureColor(tenantId: string, id: string) {
        const row = await this.prisma.productColor.findFirst({
            where: { id, tenantId },
        });
        if (!row) throw new NotFoundException('Renk bulunamadı');
        return row;
    }

    private async ensureCodeFree(tenantId: string, code: string, excludeId?: string) {
        const dup = await this.prisma.productColor.findFirst({
            where: {
                tenantId,
                code,
                isDeleted: false,
                ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
        });
        if (dup) {
            throw new BadRequestException('Bu renk kodu zaten kullanılıyor');
        }
    }
}
