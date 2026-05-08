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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CashRegisterService } from './cash-register.service';
import {
  CashMovementDto,
  CloseCashRegisterDto,
  OpenCashRegisterDto,
} from './dto/cash-register.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Cash Register')
@Controller('cash-register')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class CashRegisterController {
  constructor(private readonly cashRegisterService: CashRegisterService) {}

  @Post('open')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Open cash register session' })
  async open(
    @TenantId() tenantId: string,
    @CurrentUser('id') cashierId: string,
    @Body() dto: OpenCashRegisterDto,
  ) {
    return this.cashRegisterService.openSession(tenantId, cashierId, dto);
  }

  @Post(':id/close')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.CASHIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close session — irreversible (gün sonu)' })
  async close(
    @TenantId() tenantId: string,
    @Param('id') sessionId: string,
    @Body() dto: CloseCashRegisterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.cashRegisterService.closeSession(tenantId, sessionId, userId, dto);
  }

  @Post(':id/adjust')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Post-close adjustment (manager approval)' })
  async adjust(
    @TenantId() tenantId: string,
    @Param('id') sessionId: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
    @CurrentUser('id') approvedBy: string,
  ) {
    return this.cashRegisterService.createAdjustment(
      tenantId,
      sessionId,
      amount,
      reason,
      approvedBy,
    );
  }

  @Post(':id/movement')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.CASHIER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Nakit giriş / çıkış (açık oturum)' })
  async movement(
    @TenantId() tenantId: string,
    @Param('id') sessionId: string,
    @CurrentUser('id') cashierId: string,
    @Body() dto: CashMovementDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.cashRegisterService.recordMovement(tenantId, sessionId, cashierId, dto, userId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current open session for cashier' })
  async getCurrent(@TenantId() tenantId: string, @CurrentUser('id') cashierId: string) {
    return this.cashRegisterService.getCurrentSession(tenantId, cashierId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List sessions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  async listSessions(
    @TenantId() tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.cashRegisterService.listSessions(tenantId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }
}
