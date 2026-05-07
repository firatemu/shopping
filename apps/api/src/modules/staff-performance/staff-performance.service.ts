import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class StaffPerformanceService {
  private readonly logger = new Logger(StaffPerformanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async setTarget(
    tenantId: string,
    dto: { userId: string; period: string; targetAmount: number; commissionRate?: number },
    _managerId: string,
  ) {
    const target = await this.prisma.salesTarget.upsert({
      where: { tenantId_userId_period: { tenantId, userId: dto.userId, period: dto.period } },
      create: {
        tenantId,
        userId: dto.userId,
        period: dto.period,
        targetAmount: dto.targetAmount,
        commissionRate: dto.commissionRate ?? 0,
      },
      update: { targetAmount: dto.targetAmount, commissionRate: dto.commissionRate ?? undefined },
    });
    this.logger.log(
      `[tenantId=${tenantId}] Sales target set: user=${dto.userId} period=${dto.period} target=${dto.targetAmount}`,
    );
    return target;
  }

  async getTargets(tenantId: string, options: { period?: string; userId?: string }) {
    const where: any = { tenantId };
    if (options.period) where.period = options.period;
    if (options.userId) where.userId = options.userId;
    return this.prisma.salesTarget.findMany({ where, orderBy: { period: 'desc' } });
  }

  async getLeaderboard(tenantId: string, period: string) {
    const targets = await this.prisma.salesTarget.findMany({
      where: { tenantId, period },
      orderBy: { achievedAmount: 'desc' },
    });

    const users = await this.prisma.user.findMany({
      where: { tenantId, isDeleted: false },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return targets.map((t) => {
      const user = userMap.get(t.userId);
      const achievementRate = t.targetAmount.gt(0)
        ? t.achievedAmount.div(t.targetAmount).mul(100).toNumber()
        : 0;
      const commission = t.achievedAmount.mul(t.commissionRate).div(100);

      return {
        userId: t.userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        role: user?.role,
        period: t.period,
        target: t.targetAmount.toString(),
        achieved: t.achievedAmount.toString(),
        achievementRate: Math.round(achievementRate * 100) / 100,
        commission: commission.toString(),
      };
    });
  }

  async recalculateAchievements(tenantId: string, period: string) {
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        isDeleted: false,
        status: 'COMPLETED',
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { soldBy: true, grandTotal: true },
    });

    const salesByUser = new Map<string, Decimal>();
    for (const order of orders) {
      const current = salesByUser.get(order.soldBy) ?? new Decimal(0);
      salesByUser.set(order.soldBy, current.add(order.grandTotal));
    }

    const targets = await this.prisma.salesTarget.findMany({ where: { tenantId, period } });

    for (const target of targets) {
      const achieved = salesByUser.get(target.userId) ?? new Decimal(0);
      await this.prisma.salesTarget.update({
        where: { id: target.id },
        data: { achievedAmount: achieved },
      });
    }

    this.logger.log(`[tenantId=${tenantId}] Achievements recalculated for period=${period}`);
    return { period, usersUpdated: targets.length };
  }
}
