import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IntegrationService {
    private readonly logger = new Logger(IntegrationService.name);

    constructor(private readonly prisma: PrismaService) { }

    async connect(tenantId: string, dto: { type: string; config: Record<string, any> }) {
        const integration = await this.prisma.integration.upsert({
            where: { tenantId_type: { tenantId, type: dto.type as any } },
            create: { tenantId, type: dto.type as any, config: dto.config, status: 'ACTIVE' },
            update: { config: dto.config, status: 'ACTIVE', syncErrors: 0 },
        });
        this.logger.log(`[tenantId=${tenantId}] Integration connected: ${dto.type}`);
        return integration;
    }

    async disconnect(tenantId: string, type: string) {
        const existing = await this.prisma.integration.findFirst({ where: { tenantId, type: type as any } });
        if (!existing) throw new NotFoundException('Entegrasyon bulunamadı');
        return this.prisma.integration.update({ where: { id: existing.id }, data: { status: 'DISCONNECTED' } });
    }

    async findAll(tenantId: string) {
        return this.prisma.integration.findMany({ where: { tenantId }, orderBy: { type: 'asc' } });
    }

    async getStatus(tenantId: string, type: string) {
        const integration = await this.prisma.integration.findFirst({ where: { tenantId, type: type as any } });
        if (!integration) throw new NotFoundException('Entegrasyon bulunamadı');
        return {
            type: integration.type,
            status: integration.status,
            lastSyncAt: integration.lastSyncAt,
            syncErrors: integration.syncErrors,
        };
    }

    async updateSyncStatus(tenantId: string, type: string, success: boolean) {
        const existing = await this.prisma.integration.findFirst({ where: { tenantId, type: type as any } });
        if (!existing) throw new NotFoundException('Entegrasyon bulunamadı');

        if (success) {
            return this.prisma.integration.update({
                where: { id: existing.id },
                data: { lastSyncAt: new Date(), syncErrors: 0, status: 'ACTIVE' },
            });
        } else {
            const newErrors = existing.syncErrors + 1;
            return this.prisma.integration.update({
                where: { id: existing.id },
                data: { syncErrors: newErrors, status: newErrors >= 5 ? 'ERROR' : 'ACTIVE' },
            });
        }
    }

    async pause(tenantId: string, type: string) {
        const existing = await this.prisma.integration.findFirst({ where: { tenantId, type: type as any } });
        if (!existing) throw new NotFoundException('Entegrasyon bulunamadı');
        return this.prisma.integration.update({ where: { id: existing.id }, data: { status: 'PAUSED' } });
    }
}
