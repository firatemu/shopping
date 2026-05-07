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
import { BranchService } from './branch.service';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Create branch' })
  async create(@TenantId() tenantId: string, @Body() dto: any) {
    return this.branchService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List branches' })
  async findAll(@TenantId() tenantId: string) {
    return this.branchService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.branchService.findById(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN)
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any) {
    return this.branchService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.branchService.remove(tenantId, id, userId);
  }

  // Stock Transfers
  @Post('transfers')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Create stock transfer' })
  async createTransfer(
    @TenantId() tenantId: string,
    @Body() dto: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.branchService.createTransfer(tenantId, dto, userId);
  }

  @Post('transfers/:id/receive')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive stock transfer' })
  async receiveTransfer(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('items') items: any,
    @CurrentUser('id') userId: string,
  ) {
    return this.branchService.receiveTransfer(tenantId, id, items, userId);
  }

  @Get('transfers/list')
  @ApiOperation({ summary: 'List transfers' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  async listTransfers(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.branchService.listTransfers(tenantId, { page, limit, status });
  }
}
