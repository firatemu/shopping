import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    dto: {
      name: string;
      code: string;
      address?: string;
      city?: string;
      phone?: string;
      isMain?: boolean;
    },
  ) {
    const branch = await this.prisma.branch.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
        isMain: dto.isMain ?? false,
      },
    });
    this.logger.log(`[tenantId=${tenantId}] Branch created: ${branch.name} (${branch.code})`);
    return branch;
  }

  async findAll(tenantId: string) {
    return this.prisma.branch.findMany({
      where: { tenantId, isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, tenantId, isDeleted: false },
    });
    if (!branch) throw new NotFoundException('Şube bulunamadı');
    return branch;
  }

  async update(
    tenantId: string,
    id: string,
    dto: Partial<{ name: string; address: string; city: string; phone: string; isActive: boolean }>,
  ) {
    await this.findById(tenantId, id);
    return this.prisma.branch.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string, _userId: string) {
    await this.findById(tenantId, id);
    await this.prisma.branch.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // Stock Transfer
  async createTransfer(
    tenantId: string,
    dto: {
      fromBranchId: string;
      toBranchId: string;
      items: Array<{ variantId: string; quantity: number }>;
      notes?: string;
    },
    userId: string,
  ) {
    if (dto.fromBranchId === dto.toBranchId)
      throw new BadRequestException('Kaynak ve hedef şube aynı olamaz');

    return this.prisma.executeTransaction(async (tx) => {
      const transfer = await tx.stockTransfer.create({
        data: {
          tenantId,
          fromBranchId: dto.fromBranchId,
          toBranchId: dto.toBranchId,
          notes: dto.notes,
          createdBy: userId,
          items: {
            create: dto.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          },
        },
        include: { items: true },
      });
      this.logger.log(
        `[tenantId=${tenantId}] Stock transfer created: ${transfer.id} — ${dto.items.length} items`,
      );
      return transfer;
    });
  }

  async receiveTransfer(
    tenantId: string,
    transferId: string,
    items: Array<{ variantId: string; receivedQty: number }>,
    userId: string,
  ) {
    return this.prisma.executeTransaction(async (tx) => {
      const transfer = await tx.stockTransfer.findFirst({
        where: { id: transferId, tenantId, status: { in: ['PENDING', 'IN_TRANSIT'] } },
        include: { items: true },
      });
      if (!transfer) throw new NotFoundException('Transfer bulunamadı');

      for (const item of items) {
        const transferItem = transfer.items.find((ti) => ti.variantId === item.variantId);
        if (transferItem) {
          await tx.stockTransferItem.update({
            where: { id: transferItem.id },
            data: { receivedQty: item.receivedQty },
          });
        }
      }

      await tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: 'RECEIVED', receivedBy: userId, completedAt: new Date() },
      });

      return { transferId, status: 'RECEIVED', itemsReceived: items.length };
    });
  }

  async listTransfers(
    tenantId: string,
    options: { page?: number; limit?: number; status?: string },
  ) {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options.status) where.status = options.status;

    const [transfers, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return { data: transfers, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
