import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLabelTemplateDto, UpdateLabelTemplateDto } from './dto/label-template.dto';

@Injectable()
export class LabelTemplateService {
    constructor(private readonly prisma: PrismaService) { }

    async create(tenantId: string, dto: CreateLabelTemplateDto, userId?: string) {
        return this.prisma.labelTemplate.create({
            data: {
                tenantId,
                name: dto.name.trim(),
                description: dto.description?.trim() || null,
                widthMm: dto.widthMm,
                heightMm: dto.heightMm,
                design: dto.design as Prisma.InputJsonValue,
                zpl: dto.zpl,
                isActive: dto.isActive ?? true,
                createdBy: userId,
                updatedBy: userId,
            },
        });
    }

    async list(tenantId: string, options: { page?: number; limit?: number; search?: string }) {
        const page = Number(options.page ?? 1);
        const limit = Math.min(Number(options.limit ?? 20), 100);
        const skip = (Math.max(page, 1) - 1) * limit;
        const search = options.search?.trim();

        const where = {
            tenantId,
            isDeleted: false,
            ...(search
                ? {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' as const } },
                        { description: { contains: search, mode: 'insensitive' as const } },
                    ],
                }
                : {}),
        };

        const [data, total] = await Promise.all([
            this.prisma.labelTemplate.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    description: true,
                    widthMm: true,
                    heightMm: true,
                    isActive: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.labelTemplate.count({ where }),
        ]);

        return {
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findOne(tenantId: string, id: string) {
        const row = await this.prisma.labelTemplate.findFirst({
            where: { id, tenantId, isDeleted: false },
        });
        if (!row) throw new NotFoundException('Etiket şablonu bulunamadı');
        return row;
    }

    async update(tenantId: string, id: string, dto: UpdateLabelTemplateDto, userId?: string) {
        await this.findOne(tenantId, id);
        return this.prisma.labelTemplate.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
                ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
                ...(dto.widthMm !== undefined ? { widthMm: dto.widthMm } : {}),
                ...(dto.heightMm !== undefined ? { heightMm: dto.heightMm } : {}),
                ...(dto.design !== undefined ? { design: dto.design as Prisma.InputJsonValue } : {}),
                ...(dto.zpl !== undefined ? { zpl: dto.zpl } : {}),
                ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
                updatedBy: userId,
            },
        });
    }

    async remove(tenantId: string, id: string, userId?: string) {
        await this.findOne(tenantId, id);
        return this.prisma.labelTemplate.update({
            where: { id },
            data: {
                isDeleted: true,
                isActive: false,
                deletedAt: new Date(),
                deletedBy: userId,
            },
        });
    }
}
