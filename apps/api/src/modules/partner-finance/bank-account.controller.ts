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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BankAccountService } from './bank-account.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  ListBankAccountsQueryDto,
} from './dto/bank-account.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Bank Accounts')
@Controller('bank-accounts')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Banka hesabı oluştur' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateBankAccountDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bankAccountService.create(tenantId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Banka hesapları listesi' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'purpose',
    required: false,
    description:
      'bank_transfer: vadesiz (havale/EFT), card_collection: POS mutabakat, card_payment: firma kredi kartı',
    enum: ['bank_transfer', 'card_collection', 'card_payment'],
  })
  async findAll(@TenantId() tenantId: string, @Query() query: ListBankAccountsQueryDto) {
    return this.bankAccountService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Banka hesabı detay' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.bankAccountService.findByIdApi(tenantId, id);
  }

  @Get(':id/movements')
  @ApiOperation({ summary: 'Banka hesap hareketleri' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async movements(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.bankAccountService.listMovements(tenantId, id, {
      page,
      limit,
      dateFrom,
      dateTo,
    });
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Banka hesabı güncelle' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBankAccountDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.bankAccountService.update(tenantId, id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Banka hesabı sil (soft)' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.bankAccountService.remove(tenantId, id, userId);
  }
}
