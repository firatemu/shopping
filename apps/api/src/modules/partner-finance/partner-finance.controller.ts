import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PartnerFinanceKind } from '@prisma/client';
import { PartnerFinanceService } from './partner-finance.service';
import {
  CreatePartnerFinanceOperationDto,
  UpdatePartnerFinanceOperationDto,
} from './dto/partner-finance.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Partner Finance')
@Controller('partner-finance')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class PartnerFinanceController {
  constructor(private readonly partnerFinanceService: PartnerFinanceService) {}

  @Post('operations')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
  @ApiOperation({ summary: 'Ödeme / tahsilat / dekont kaydı — cari ve kasa/banka ile atomik' })
  async createOperation(
    @TenantId() tenantId: string,
    @Body() dto: CreatePartnerFinanceOperationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnerFinanceService.create(tenantId, dto, userId);
  }

  @Get('operations')
  @ApiOperation({ summary: 'İşlem listesi' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'kind', required: false, enum: PartnerFinanceKind })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async listOperations(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('customerId') customerId?: string,
    @Query('kind') kind?: PartnerFinanceKind,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.partnerFinanceService.findAll(tenantId, {
      page,
      limit,
      customerId,
      kind,
      dateFrom,
      dateTo,
    });
  }

  @Get('operations/upcoming-instruments')
  @ApiOperation({ summary: 'Çek/senet yaklaşan vadeler (metadata.dueDate)' })
  @ApiQuery({ name: 'daysAhead', required: false })
  async upcoming(@TenantId() tenantId: string, @Query('daysAhead') daysAhead?: number) {
    return this.partnerFinanceService.listUpcomingInstruments(tenantId, {
      daysAhead: daysAhead ?? 30,
    });
  }

  @Get('operations/:id')
  @ApiOperation({ summary: 'İşlem detayı' })
  async getOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.partnerFinanceService.findById(tenantId, id);
  }

  @Get('operations/:id/receipt')
  @ApiOperation({ summary: 'Makbuz / dekont yazdır' })
  async generateReceipt(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.partnerFinanceService.generateOperationReceipt(tenantId, id);
  }

  @Get('operations/:id/receipt/pdf')
  @ApiOperation({ summary: 'Makbuz PDF indir' })
  @ApiQuery({ name: 'paper', required: false, enum: ['A4', 'A5'] })
  @ApiQuery({ name: 'orientation', required: false, enum: ['portrait', 'landscape'] })
  async downloadReceiptPdf(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
    @Query('paper') paper?: 'A4' | 'A5',
    @Query('orientation') orientation?: 'portrait' | 'landscape',
  ) {
    const buffer = await this.partnerFinanceService.generateOperationReceiptPdf(tenantId, id, {
      paper,
      orientation,
    });
    const safeId = id.slice(0, 8);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=makbuz_${safeId}.pdf`,
    });
    res.send(buffer);
  }

  @Patch('operations/:id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'İşlem güncelle (tutar / tarih / açıklama)' })
  async updateOperation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePartnerFinanceOperationDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.partnerFinanceService.update(tenantId, id, dto, userId);
  }

  @Delete('operations/:id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'İşlemi sil (soft) — bağlı cari/kasa/banka etkileri geri alınır' })
  async removeOperation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.partnerFinanceService.remove(tenantId, id, userId);
  }
}
