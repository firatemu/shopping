import { Controller, Get, Post, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { StaffPerformanceService } from './staff-performance.service';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Staff Performance')
@Controller('staff-performance')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class StaffPerformanceController {
    constructor(private readonly staffService: StaffPerformanceService) { }

    @Post('targets')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    @ApiOperation({ summary: 'Set sales target for staff' })
    async setTarget(@TenantId() tenantId: string, @Body() dto: any, @CurrentUser('id') managerId: string) {
        return this.staffService.setTarget(tenantId, dto, managerId);
    }

    @Get('targets')
    @ApiOperation({ summary: 'Get targets' })
    @ApiQuery({ name: 'period', required: false }) @ApiQuery({ name: 'userId', required: false })
    async getTargets(@TenantId() tenantId: string, @Query('period') period?: string, @Query('userId') userId?: string) {
        return this.staffService.getTargets(tenantId, { period, userId });
    }

    @Get('leaderboard')
    @ApiOperation({ summary: 'Staff leaderboard with commission' })
    @ApiQuery({ name: 'period', required: true, example: '2026-05' })
    async getLeaderboard(@TenantId() tenantId: string, @Query('period') period: string) {
        return this.staffService.getLeaderboard(tenantId, period);
    }

    @Post('recalculate')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Recalculate achievements from orders' })
    async recalculate(@TenantId() tenantId: string, @Body('period') period: string) {
        return this.staffService.recalculateAchievements(tenantId, period);
    }
}
