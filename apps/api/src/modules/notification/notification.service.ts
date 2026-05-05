import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(private readonly prisma: PrismaService) { }

    async create(tenantId: string, dto: { userId: string; title: string; body: string; channel?: string; metadata?: any }) {
        const notification = await this.prisma.notification.create({
            data: {
                tenantId,
                userId: dto.userId,
                channel: (dto.channel as any) ?? 'IN_APP',
                title: dto.title,
                body: dto.body,
                metadata: dto.metadata,
            },
        });
        return notification;
    }

    async createBulk(tenantId: string, userIds: string[], title: string, body: string) {
        const data = userIds.map((userId) => ({ tenantId, userId, channel: 'IN_APP' as any, title, body }));
        await this.prisma.notification.createMany({ data });
        this.logger.log(`[tenantId=${tenantId}] Bulk notification sent to ${userIds.length} users`);
        return { sent: userIds.length };
    }

    async getMyNotifications(tenantId: string, userId: string, options: { unreadOnly?: boolean; page?: number; limit?: number }) {
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 20, 50);
        const skip = (page - 1) * limit;

        const where: any = { tenantId, userId };
        if (options.unreadOnly) where.isRead = false;

        const [notifications, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({ where: { tenantId, userId, isRead: false } }),
        ]);

        return { data: notifications, unreadCount, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async markAsRead(tenantId: string, userId: string, notificationId: string) {
        await this.prisma.notification.updateMany({
            where: { id: notificationId, tenantId, userId },
            data: { isRead: true, readAt: new Date() },
        });
    }

    async markAllAsRead(tenantId: string, userId: string) {
        const result = await this.prisma.notification.updateMany({
            where: { tenantId, userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        return { markedAsRead: result.count };
    }
}
