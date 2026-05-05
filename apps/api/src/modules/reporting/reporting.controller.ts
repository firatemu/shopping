import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ReportingService } from './reporting.service';
import { ExportService } from '../../common/services/export.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Reporting')
@Controller('reports')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ReportingController {
    constructor(
        private readonly reportingService: ReportingService,
        private readonly exportService: ExportService,
    ) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'Dashboard KPIs' })
    async getDashboard(@TenantId() tenantId: string) {
        return this.reportingService.getDashboardKpis(tenantId);
    }

    @Get('daily-sales')
    @Roles(
        UserRole.TENANT_ADMIN,
        UserRole.STORE_MANAGER,
        UserRole.ACCOUNTANT,
        UserRole.SENIOR_SALES,
        UserRole.SALES_STAFF,
    )
    @ApiOperation({ summary: 'Daily sales summary' })
    @ApiQuery({ name: 'date', required: true, example: '2026-05-03' })
    async getDailySales(@TenantId() tenantId: string, @Query('date') date: string) {
        return this.reportingService.getDailySales(tenantId, date);
    }

    @Get('top-products')
    @ApiOperation({ summary: 'Top selling products' })
    @ApiQuery({ name: 'dateFrom', required: false }) @ApiQuery({ name: 'dateTo', required: false }) @ApiQuery({ name: 'limit', required: false })
    async getTopProducts(@TenantId() tenantId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Query('limit') limit?: number) {
        return this.reportingService.getTopProducts(tenantId, { dateFrom, dateTo, limit });
    }

    @Get('dead-stock')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    @ApiOperation({ summary: 'Dead stock (not sold in N days)' })
    @ApiQuery({ name: 'days', required: false, example: 30 })
    async getDeadStock(@TenantId() tenantId: string, @Query('days') days?: number) {
        return this.reportingService.getDeadStock(tenantId, days ?? 30);
    }

    // ==========================================
    // EXPORT ENDPOINTS
    // ==========================================

    @Get('daily-sales/excel')
    @Roles(
        UserRole.TENANT_ADMIN,
        UserRole.STORE_MANAGER,
        UserRole.ACCOUNTANT,
        UserRole.SENIOR_SALES,
        UserRole.SALES_STAFF,
    )
    @ApiOperation({ summary: 'Export daily sales as Excel' })
    @ApiQuery({ name: 'date', required: true })
    async exportDailySalesExcel(@TenantId() tenantId: string, @Query('date') date: string, @Res() res: Response) {
        const data = await this.reportingService.getDailySales(tenantId, date);
        const buffer = await this.exportService.generateExcel({
            sheetName: 'Günlük Satış',
            title: `Günlük Satış Raporu — ${date}`,
            columns: [
                { header: 'Metrik', key: 'metric', width: 25 },
                { header: 'Değer', key: 'value', width: 20 },
            ],
            rows: [
                { metric: 'Toplam Sipariş', value: data.totalOrders },
                { metric: 'Toplam İade', value: data.totalReturns },
                { metric: 'Brüt Ciro', value: `₺${data.revenue}` },
                { metric: 'İade Tutarı', value: `₺${data.returnAmount}` },
                { metric: 'Net Ciro', value: `₺${data.netRevenue}` },
                { metric: 'Toplam Kalem', value: data.totalItems },
                ...Object.entries(data.paymentBreakdown).map(([k, v]) => ({ metric: `Ödeme: ${k}`, value: `₺${v}` })),
            ],
        });
        res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename=satis_${date}.xlsx` });
        res.send(buffer);
    }

    @Get('top-products/excel')
    @ApiOperation({ summary: 'Export top products as Excel' })
    @ApiQuery({ name: 'dateFrom', required: false }) @ApiQuery({ name: 'dateTo', required: false })
    async exportTopProductsExcel(@TenantId() tenantId: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Res() res?: Response) {
        const data = await this.reportingService.getTopProducts(tenantId, { dateFrom, dateTo });
        const buffer = await this.exportService.generateExcel({
            sheetName: 'En Çok Satanlar',
            title: 'En Çok Satan Ürünler',
            columns: [
                { header: 'Ürün', key: 'name', width: 30 },
                { header: 'Marka', key: 'brand', width: 15 },
                { header: 'Adet', key: 'totalQuantity', width: 10 },
                { header: 'Ciro', key: 'totalRevenue', width: 15 },
            ],
            rows: data.map((p) => ({ ...p, totalRevenue: `₺${p.totalRevenue}` })),
        });
        res!.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename=top_urunler.xlsx' });
        res!.send(buffer);
    }

    @Get('daily-sales/pdf')
    @Roles(
        UserRole.TENANT_ADMIN,
        UserRole.STORE_MANAGER,
        UserRole.ACCOUNTANT,
        UserRole.SENIOR_SALES,
        UserRole.SALES_STAFF,
    )
    @ApiOperation({ summary: 'Export daily sales as PDF' })
    @ApiQuery({ name: 'date', required: true })
    async exportDailySalesPdf(@TenantId() tenantId: string, @Query('date') date: string, @Res() res: Response) {
        const data = await this.reportingService.getDailySales(tenantId, date);
        const buffer = await this.exportService.generatePdf({
            title: 'Günlük Satış Raporu',
            subtitle: `Tarih: ${date}`,
            sections: [
                {
                    heading: 'Özet', content: [
                        ['Metrik', 'Değer'],
                        ['Toplam Sipariş', String(data.totalOrders)],
                        ['Toplam İade', String(data.totalReturns)],
                        ['Net Ciro', `₺${data.netRevenue}`],
                        ['Toplam Kalem', String(data.totalItems)],
                    ]
                },
                { heading: 'Ödeme Dökümü', content: Object.entries(data.paymentBreakdown).map(([k, v]) => [k, `₺${v}`]) },
            ],
        });
        res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename=satis_${date}.pdf` });
        res.send(buffer);
    }
}
