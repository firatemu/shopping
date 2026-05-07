import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GiftVoucherService } from './gift-voucher.service';
import { CreateCorporateGiftVoucherDto, LookupGiftVoucherQueryDto } from './dto/gift-voucher.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Gift Vouchers')
@Controller('gift-vouchers')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class GiftVoucherController {
  constructor(private readonly giftVoucherService: GiftVoucherService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Kurumsal hediye çeki oluştur' })
  async createCorporate(
    @TenantId() tenantId: string,
    @Body() dto: CreateCorporateGiftVoucherDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.giftVoucherService.createCorporate(tenantId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Hediye çeklerini listele' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'USED', 'EXPIRED', 'ALL'] })
  async list(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'USED' | 'EXPIRED' | 'ALL',
  ) {
    return this.giftVoucherService.list(tenantId, { page, limit, search, status });
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Çek numarası ile sorgula (POS)' })
  async lookup(@TenantId() tenantId: string, @Query() q: LookupGiftVoucherQueryDto) {
    return this.giftVoucherService.lookup(tenantId, q.code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Hediye çeki detayı ve kullanım geçmişi' })
  async getById(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.giftVoucherService.findById(tenantId, id);
  }
}
