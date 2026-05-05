import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentType } from '@prisma/client';
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

    @Get('daily-summary')
    @Roles(
        UserRole.TENANT_ADMIN,
        UserRole.STORE_MANAGER,
        UserRole.ACCOUNTANT,
        UserRole.SENIOR_SALES,
        UserRole.SALES_STAFF,
    )
    @ApiOperation({ summary: 'Mobil günlük özet (KPI + günlük satış)' })
    @ApiQuery({ name: 'date', required: false, example: '2026-05-06' })
    async getDailySummary(@TenantId() tenantId: string, @Query('date') date?: string) {
        const d = date?.trim() || new Date().toISOString().slice(0, 10);
        return this.reportingService.getMobileDailySummary(tenantId, d);
    }

    @Get('sales-trend')
    @Roles(
        UserRole.TENANT_ADMIN,
        UserRole.STORE_MANAGER,
        UserRole.ACCOUNTANT,
        UserRole.SENIOR_SALES,
        UserRole.SALES_STAFF,
    )
    @ApiOperation({ summary: 'Son N gün satış trendi' })
    @ApiQuery({ name: 'days', required: false, example: 7 })
    async getSalesTrend(@TenantId() tenantId: string, @Query('days') days?: number) {
        return this.reportingService.getSalesTrend(tenantId, Number(days) || 7);
    }

    @Get('sales')
    @Roles(
        UserRole.TENANT_ADMIN,
        UserRole.STORE_MANAGER,
        UserRole.ACCOUNTANT,
        UserRole.SENIOR_SALES,
        UserRole.SALES_STAFF,
    )
    @ApiOperation({ summary: 'Satış listesi (tarih aralığı, sayfalı)' })
    @ApiQuery({ name: 'startDate', required: true })
    @ApiQuery({ name: 'endDate', required: true })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'paymentType', required: false, enum: PaymentType })
    @ApiQuery({ name: 'soldBy', required: false })
    async getSalesReport(
        @TenantId() tenantId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('paymentType') paymentType?: PaymentType,
        @Query('soldBy') soldBy?: string,
    ) {
        return this.reportingService.getSalesReport(tenantId, {
            startDate,
            endDate,
            page,
            limit,
            paymentType,
            soldBy,
        });
    }

    @Get('stock-overview')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Stok özeti (kategori, kritik, maliyet değeri)' })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'brand', required: false })
    async getStockOverview(
        @TenantId() tenantId: string,
        @Query('category') category?: string,
        @Query('brand') brand?: string,
    ) {
        return this.reportingService.getStockOverviewReport(tenantId, { category, brand });
    }

    @Get('cash-sessions')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Kasa oturumları ve nakit hareket özeti (düzeltme kayıtları)' })
    @ApiQuery({ name: 'dateFrom', required: true })
    @ApiQuery({ name: 'dateTo', required: true })
    async getCashSessions(
        @TenantId() tenantId: string,
        @Query('dateFrom') dateFrom: string,
        @Query('dateTo') dateTo: string,
    ) {
        return this.reportingService.getCashRegisterSessionsReport(tenantId, dateFrom, dateTo);
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
