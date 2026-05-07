import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignDto, CreateGiftVoucherDto } from './dto/campaign.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Campaigns')
@Controller('campaigns')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Create campaign' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateCampaignDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignService.create(tenantId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List campaigns' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @TenantId() tenantId: string,
    @Query('activeOnly') activeOnly?: boolean,
    @Query('search') search?: string,
  ) {
    return this.campaignService.findAll(tenantId, { activeOnly, search });
  }

  /** Static paths must precede `:id`, otherwise `/campaigns/vouchers` resolves as id="vouchers". */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate applicable discounts for a cart' })
  async calculateDiscounts(
    @TenantId() tenantId: string,
    @Body()
    body: {
      items: Array<{
        barcode: string;
        quantity: number;
        unitPrice: number;
        category?: string;
        brand?: string;
      }>;
    },
  ) {
    return this.campaignService.calculateDiscounts(tenantId, body.items);
  }

  @Post('vouchers')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Create gift voucher' })
  async createVoucher(
    @TenantId() tenantId: string,
    @Body() dto: CreateGiftVoucherDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignService.createGiftVoucher(tenantId, dto, userId);
  }

  @Get('vouchers')
  @ApiOperation({ summary: 'List gift vouchers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async listVouchers(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignService.listVouchers(tenantId, { page, limit });
  }

  @Get('vouchers/:code')
  @ApiOperation({ summary: 'Lookup gift voucher by code' })
  async lookupVoucher(@TenantId() tenantId: string, @Param('code') code: string) {
    return this.campaignService.lookupVoucher(tenantId, code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.campaignService.findById(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Update campaign' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.campaignService.update(tenantId, id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete campaign' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.campaignService.remove(tenantId, id, userId);
  }
}
