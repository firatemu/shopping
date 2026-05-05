import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CashRegisterService {
    private readonly logger = new Logger(CashRegisterService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Open a new cash register session.
     */
    async openSession(tenantId: string, cashierId: string, openingBalance: number) {
        const existingOpen = await this.prisma.cashRegisterSession.findFirst({
            where: { tenantId, cashierId, status: 'OPEN' },
        });
        if (existingOpen) {
            throw new BadRequestException('Bu kasiyerin zaten açık bir oturumu var');
        }

        const session = await this.prisma.cashRegisterSession.create({
            data: { tenantId, cashierId, openingBalance },
        });

        this.logger.log(`[tenantId=${tenantId}] Cash register opened: session=${session.id}, cashier=${cashierId}`);
        return session;
    }

    /**
     * Close session — atomic, irreversible (gün sonu kapanışı).
     */
    async closeSession(tenantId: string, sessionId: string, physicalCount: number, userId: string) {
        return this.prisma.executeTransaction(async (tx) => {
            const session = await tx.cashRegisterSession.findFirst({
                where: { id: sessionId, tenantId, status: 'OPEN' },
            });
            if (!session) throw new NotFoundException('Açık kasa oturumu bulunamadı');

            const expectedBalance = session.openingBalance.add(session.totalCash);
            const difference = new Decimal(physicalCount).sub(expectedBalance);

            const closed = await tx.cashRegisterSession.update({
                where: { id: sessionId },
                data: {
                    status: 'CLOSED',
                    closingBalance: expectedBalance,
                    physicalCount,
                    difference,
                    closedAt: new Date(),
                    closedBy: userId,
                },
            });

            await tx.auditLog.create({
                data: {
                    tenantId, userId, entityType: 'CashRegisterSession', entityId: sessionId, action: 'CLOSE',
                    newValue: { closingBalance: expectedBalance.toString(), physicalCount, difference: difference.toString() } as any,
                },
            });

            this.logger.log(`[tenantId=${tenantId}] Cash register closed: session=${sessionId}, diff=${difference}`);
            return closed;
        });
    }

    /**
     * Post-close adjustment (requires manager approval).
     */
    async createAdjustment(tenantId: string, sessionId: string, amount: number, reason: string, approvedBy: string) {
        const session = await this.prisma.cashRegisterSession.findFirst({
            where: { id: sessionId, tenantId, status: 'CLOSED' },
        });
        if (!session) throw new NotFoundException('Kapalı kasa oturumu bulunamadı');

        const adjustment = await this.prisma.cashRegisterAdjustment.create({
            data: { tenantId, sessionId, amount, reason, approvedBy },
        });

        await this.prisma.cashRegisterSession.update({
            where: { id: sessionId },
            data: { status: 'ADJUSTED' },
        });

        return adjustment;
    }

    /**
     * Get current open session for cashier.
     */
    async getCurrentSession(tenantId: string, cashierId: string) {
        const session = await this.prisma.cashRegisterSession.findFirst({
            where: { tenantId, cashierId, status: 'OPEN' },
            include: { adjustments: true },
        });
        if (!session) throw new NotFoundException('Açık kasa oturumu bulunamadı');
        return session;
    }

    /**
     * List sessions with pagination.
     */
    async listSessions(tenantId: string, options: { page?: number; limit?: number; status?: string }) {
        const page = options.page ?? 1;
        const limit = Math.min(options.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where: any = { tenantId };
        if (options.status) where.status = options.status;

        const [sessions, total] = await Promise.all([
            this.prisma.cashRegisterSession.findMany({
                where, orderBy: { openedAt: 'desc' }, skip, take: limit,
                include: { adjustments: true },
            }),
            this.prisma.cashRegisterSession.count({ where }),
        ]);

        const cashierIds = [...new Set(sessions.map((s) => s.cashierId))];
        const cashiers =
            cashierIds.length === 0
                ? []
                : await this.prisma.user.findMany({
                      where: { id: { in: cashierIds } },
                      select: { id: true, firstName: true, lastName: true },
                  });
        const nameById = Object.fromEntries(
            cashiers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]),
        );

        const data = sessions.map((s) => ({
            id: s.id,
            openedAt: s.openedAt.toISOString(),
            closedAt: s.closedAt?.toISOString() ?? null,
            openingBalance: Number(s.openingBalance),
            closingBalance: s.closingBalance != null ? Number(s.closingBalance) : null,
            status: s.status,
            openedByName: nameById[s.cashierId] ?? '—',
            physicalCount: s.physicalCount != null ? Number(s.physicalCount) : null,
            difference: s.difference != null ? Number(s.difference) : null,
            adjustments: s.adjustments,
        }));

        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
}
