import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * BullMQ Worker: Scheduled jobs for overdue alerts, recurring expenses, and heavy reports.
 *
 * Queue: 'scheduled-tasks'
 * Job types:
 * - overdue-check: scans customers with currentBalance > creditLimit
 * - recurring-expenses: creates expenses for recurring entries on their recurringDay
 * - daily-closing-report: generates end-of-day summary
 */
@Processor('scheduled-tasks')
export class ScheduledTasksProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledTasksProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case 'overdue-check':
        return this.processOverdueCheck(job);
      case 'recurring-expenses':
        return this.processRecurringExpenses(job);
      case 'daily-closing-report':
        return this.processDailyReport(job);
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Scan all tenants for customers exceeding credit limit.
   * Creates notifications for TENANT_ADMIN users.
   */
  private async processOverdueCheck(job: Job) {
    this.logger.log(`[Job ${job.id}] Starting overdue check...`);

    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    let totalAlerts = 0;

    for (const tenant of tenants) {
      const overdueCustomers = await this.prisma.customer.findMany({
        where: {
          tenantId: tenant.id,
          isDeleted: false,
          isActive: true,
          currentBalance: { gt: 0 },
        },
      });

      const overLimit = overdueCustomers.filter(
        (c) => c.creditLimit && c.currentBalance.greaterThan(c.creditLimit),
      );

      if (overLimit.length > 0) {
        // Find admin users for this tenant
        const admins = await this.prisma.user.findMany({
          where: { tenantId: tenant.id, role: 'TENANT_ADMIN', isActive: true },
        });

        for (const admin of admins) {
          await this.prisma.notification.create({
            data: {
              tenantId: tenant.id,
              userId: admin.id,
              title: `${overLimit.length} müşteri kredi limitini aştı`,
              body: `Müşteriler: ${overLimit.map((c) => `${c.name} ${c.surname}`).join(', ')}`,
              channel: 'IN_APP',
              metadata: { overdueCount: overLimit.length, customerIds: overLimit.map((c) => c.id) },
            },
          });
        }
        totalAlerts += overLimit.length;
      }
    }

    this.logger.log(`[Job ${job.id}] Overdue check complete: ${totalAlerts} alerts created`);
    return { totalAlerts };
  }

  /**
   * Create expenses for recurring entries on the matching day of month.
   */
  private async processRecurringExpenses(job: Job) {
    this.logger.log(`[Job ${job.id}] Processing recurring expenses...`);
    const today = new Date();
    const dayOfMonth = today.getDate();

    const recurringExpenses = await this.prisma.expense.findMany({
      where: { isRecurring: true, recurringDay: dayOfMonth, isDeleted: false },
      include: { category: true },
    });

    let created = 0;
    for (const expense of recurringExpenses) {
      await this.prisma.expense.create({
        data: {
          tenantId: expense.tenantId,
          type: expense.type,
          categoryId: expense.categoryId,
          amount: expense.amount,
          description: `[Otomatik] ${expense.description ?? expense.category.name}`,
          reference: `RECURRING-${expense.id}-${today.toISOString().split('T')[0]}`,
          createdBy: expense.createdBy,
        },
      });
      created++;
    }

    this.logger.log(`[Job ${job.id}] Recurring expenses: ${created} created`);
    return { created };
  }

  /**
   * Generate end-of-day report for all active tenants.
   */
  private async processDailyReport(job: Job) {
    this.logger.log(`[Job ${job.id}] Generating daily reports...`);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const tenants = await this.prisma.tenant.findMany({ where: { isActive: true } });
    let processed = 0;

    for (const tenant of tenants) {
      const startOfDay = new Date(`${dateStr}T00:00:00Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59Z`);

      const orders = await this.prisma.order.count({
        where: { tenantId: tenant.id, createdAt: { gte: startOfDay, lte: endOfDay } },
      });

      // Notify admins
      const admins = await this.prisma.user.findMany({
        where: { tenantId: tenant.id, role: 'TENANT_ADMIN', isActive: true },
      });

      for (const admin of admins) {
        await this.prisma.notification.create({
          data: {
            tenantId: tenant.id,
            userId: admin.id,
            title: `Günlük Rapor — ${dateStr}`,
            body: `Toplam sipariş: ${orders}`,
            channel: 'IN_APP',
            metadata: { date: dateStr, totalOrders: orders },
          },
        });
      }
      processed++;
    }

    this.logger.log(`[Job ${job.id}] Daily reports: ${processed} tenants processed`);
    return { processed };
  }
}
