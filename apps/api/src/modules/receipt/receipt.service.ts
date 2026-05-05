import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Receipt commands for ESC/POS compatible thermal printers.
 * Generates binary command arrays that can be sent to printer hardware.
 */
const ESC = 0x1B;
const GS = 0x1D;

const COMMANDS = {
    INIT: [ESC, 0x40],
    CENTER: [ESC, 0x61, 0x01],
    LEFT: [ESC, 0x61, 0x00],
    RIGHT: [ESC, 0x61, 0x02],
    BOLD_ON: [ESC, 0x45, 0x01],
    BOLD_OFF: [ESC, 0x45, 0x00],
    DOUBLE_HEIGHT: [GS, 0x21, 0x01],
    NORMAL_SIZE: [GS, 0x21, 0x00],
    CUT: [GS, 0x56, 0x00],
    FEED_LINES: (n: number) => [ESC, 0x64, n],
};

interface ReceiptLine {
    text: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    doubleHeight?: boolean;
}

@Injectable()
export class ReceiptService {
    private static readonly RECEIPT_WIDTH = 48;

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Generate receipt data for an order.
     * Returns both human-readable text and ESC/POS binary commands.
     */
    async generateReceipt(tenantId: string, orderId: string) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: { product: true },
                        },
                    },
                },
                payments: true,
            },
        });

        if (!order) throw new NotFoundException('Sipariş bulunamadı');

        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) throw new NotFoundException('Tenant bulunamadı');

        const lines = this.buildReceiptLines(tenant, order);
        const textReceipt = this.renderTextReceipt(lines);
        const escposCommands = this.renderEscPos(lines);

        return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            textReceipt,
            escposCommands: Buffer.from(escposCommands).toString('base64'),
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Build receipt line structure.
     */
    private buildReceiptLines(tenant: any, order: any): ReceiptLine[] {
        const W = ReceiptService.RECEIPT_WIDTH;
        const lines: ReceiptLine[] = [];
        const divider = '='.repeat(W);
        const thinDivider = '-'.repeat(W);

        // Header
        lines.push({ text: tenant.name.toUpperCase(), align: 'center', bold: true, doubleHeight: true });
        lines.push({ text: '', align: 'center' });
        lines.push({ text: divider, align: 'left' });
        lines.push({ text: `Fiş No: ${order.orderNumber}`, align: 'left' });
        lines.push({ text: `Tarih : ${this.formatDate(order.createdAt)}`, align: 'left' });
        lines.push({ text: divider, align: 'left' });

        // Items
        lines.push({ text: this.padLine('ÜRÜN', 'TUTAR', W), align: 'left', bold: true });
        lines.push({ text: thinDivider, align: 'left' });

        for (const item of order.items) {
            const productName = item.variant.product.name;
            const variantInfo = `${item.variant.color} / ${item.variant.size}`;
            const qty = item.quantity;
            const unitPrice = Number(item.unitPrice);
            const lineTotal = Number(item.lineTotal);

            lines.push({ text: productName, align: 'left' });
            lines.push({
                text: this.padLine(
                    `  ${variantInfo} x${qty} @${this.formatMoney(unitPrice)}`,
                    this.formatMoney(lineTotal),
                    W,
                ),
                align: 'left',
            });
        }

        lines.push({ text: thinDivider, align: 'left' });

        // Totals
        lines.push({ text: this.padLine('Ara Toplam:', this.formatMoney(Number(order.subtotal)), W), align: 'left' });

        if (Number(order.discountTotal) > 0) {
            lines.push({
                text: this.padLine('İskonto:', `-${this.formatMoney(Number(order.discountTotal))}`, W),
                align: 'left',
            });
        }

        lines.push({ text: this.padLine('KDV:', this.formatMoney(Number(order.kdvTotal)), W), align: 'left' });
        lines.push({ text: divider, align: 'left' });
        lines.push({
            text: this.padLine('TOPLAM:', this.formatMoney(Number(order.grandTotal)), W),
            align: 'left',
            bold: true,
            doubleHeight: true,
        });
        lines.push({ text: divider, align: 'left' });

        // Payments
        lines.push({ text: 'ÖDEME BİLGİLERİ', align: 'center', bold: true });
        for (const payment of order.payments) {
            const typeLabel = this.getPaymentTypeLabel(payment.type);
            lines.push({
                text: this.padLine(typeLabel, this.formatMoney(Number(payment.amount)), W),
                align: 'left',
            });
        }

        lines.push({ text: divider, align: 'left' });

        // Footer
        lines.push({ text: '', align: 'center' });
        lines.push({ text: 'Teşekkür ederiz!', align: 'center', bold: true });
        lines.push({ text: 'İyi günler dileriz.', align: 'center' });
        lines.push({ text: '', align: 'center' });

        return lines;
    }

    /**
     * Render receipt as plain text (for preview/email).
     */
    private renderTextReceipt(lines: ReceiptLine[]): string {
        return lines.map((line) => line.text).join('\n');
    }

    /**
     * Render receipt as ESC/POS binary commands for thermal printer.
     */
    private renderEscPos(lines: ReceiptLine[]): number[] {
        const commands: number[] = [...COMMANDS.INIT];

        for (const line of lines) {
            // Alignment
            if (line.align === 'center') commands.push(...COMMANDS.CENTER);
            else if (line.align === 'right') commands.push(...COMMANDS.RIGHT);
            else commands.push(...COMMANDS.LEFT);

            // Style
            if (line.bold) commands.push(...COMMANDS.BOLD_ON);
            if (line.doubleHeight) commands.push(...COMMANDS.DOUBLE_HEIGHT);

            // Text
            const bytes = Buffer.from(line.text + '\n', 'utf-8');
            commands.push(...bytes);

            // Reset style
            if (line.bold) commands.push(...COMMANDS.BOLD_OFF);
            if (line.doubleHeight) commands.push(...COMMANDS.NORMAL_SIZE);
        }

        // Feed and cut
        commands.push(...COMMANDS.FEED_LINES(4));
        commands.push(...COMMANDS.CUT);

        return commands;
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    private padLine(left: string, right: string, width: number): string {
        const padding = width - left.length - right.length;
        if (padding <= 0) return `${left} ${right}`;
        return `${left}${' '.repeat(padding)}${right}`;
    }

    private formatMoney(amount: number): string {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(amount);
    }

    private formatDate(date: Date): string {
        return new Intl.DateTimeFormat('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }

    private getPaymentTypeLabel(type: string): string {
        const labels: Record<string, string> = {
            CASH: 'Nakit',
            CREDIT_CARD: 'Kredi Kartı',
            BANK_TRANSFER: 'Havale/EFT',
            OPEN_ACCOUNT: 'Açık Hesap',
            GIFT_VOUCHER: 'Hediye Çeki',
        };
        return labels[type] ?? type;
    }
}
