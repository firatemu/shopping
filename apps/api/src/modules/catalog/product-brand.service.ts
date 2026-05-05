import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductBrandDto, UpdateProductBrandDto } from './dto/catalog.dto';

@Injectable()
export class ProductBrandService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.productBrand.findMany({
            where: { tenantId },
            orderBy: [{ name: 'asc' }],
        });
    }

    async create(tenantId: string, dto: CreateProductBrandDto) {
        const name = dto.name.trim();
        const code = dto.code.trim().toUpperCase();
        await this.ensureCodeFree(tenantId, code);

        return this.prisma.productBrand.create({
            data: { tenantId, name, code },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateProductBrandDto) {
        await this.ensureBrand(tenantId, id);

        const code = dto.code !== undefined ? dto.code.trim().toUpperCase() : undefined;
        if (code) {
            await this.ensureCodeFree(tenantId, code, id);
        }

        return this.prisma.productBrand.update({
            where: { id },
            data: {
                name: dto.name !== undefined ? dto.name.trim() : undefined,
                code,
                isActive: dto.isActive,
            },
        });
    }

    async remove(tenantId: string, id: string, userId: string) {
        await this.ensureBrand(tenantId, id);
        return this.prisma.productBrand.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date(), deletedBy: userId },
        });
    }

    private async ensureBrand(tenantId: string, id: string) {
        const row = await this.prisma.productBrand.findFirst({
            where: { id, tenantId },
        });
        if (!row) throw new NotFoundException('Marka bulunamadı');
        return row;
    }

    private async ensureCodeFree(tenantId: string, code: string, excludeId?: string) {
        const dup = await this.prisma.productBrand.findFirst({
            where: {
                tenantId,
                code,
                isDeleted: false,
                ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
        });
        if (dup) {
            throw new BadRequestException('Bu marka kodu zaten kullanılıyor');
        }
    }
}
