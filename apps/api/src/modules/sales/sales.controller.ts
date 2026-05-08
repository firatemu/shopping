import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SalesService } from './sales.service';
import { CreateOrderDto, CreateReturnDto } from './dto/sales.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Sales')
@Controller('sales')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Complete checkout — atomic transaction' })
  async checkout(
    @TenantId() tenantId: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.checkout(tenantId, dto, userId);
  }

  @Post('returns')
  @Roles(UserRole.STORE_MANAGER, UserRole.SENIOR_SALES, UserRole.CASHIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process return (partial or full)' })
  async processReturn(
    @TenantId() tenantId: string,
    @Body() dto: CreateReturnDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.salesService.processReturn(tenantId, dto, userId);
  }

  @Get('orders')
  @ApiOperation({ summary: 'List orders with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async listOrders(
    @TenantId() tenantId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.salesService.listOrders(tenantId, { page, limit, status, dateFrom, dateTo });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get order by ID with items and payments' })
  async getOrder(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.salesService.getOrderById(tenantId, id);
  }
}
