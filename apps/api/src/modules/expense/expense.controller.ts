import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ExpenseService } from './expense.service';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ExpenseController {
    constructor(private readonly expenseService: ExpenseService) { }

    @Post()
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Create income/expense' })
    async create(@TenantId() tenantId: string, @Body() dto: any, @CurrentUser('id') userId: string) {
        return this.expenseService.create(tenantId, dto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'List expenses' })
    @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'type', required: false }) @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'dateFrom', required: false }) @ApiQuery({ name: 'dateTo', required: false })
    @ApiQuery({ name: 'search', required: false })
    async findAll(@TenantId() tenantId: string, @Query('page') page?: number, @Query('limit') limit?: number, @Query('type') type?: string, @Query('category') category?: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string, @Query('search') search?: string) {
        return this.expenseService.findAll(tenantId, { page, limit, type, category, dateFrom, dateTo, search });
    }

    @Get('summary')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Income/expense summary for period' })
    @ApiQuery({ name: 'dateFrom', required: true }) @ApiQuery({ name: 'dateTo', required: true })
    async getSummary(@TenantId() tenantId: string, @Query('dateFrom') dateFrom: string, @Query('dateTo') dateTo: string) {
        return this.expenseService.getSummary(tenantId, { dateFrom, dateTo });
    }

    @Get(':id')
    async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.expenseService.findById(tenantId, id);
    }

    @Put(':id')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
    async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') userId: string) {
        return this.expenseService.update(tenantId, id, dto, userId);
    }

    @Delete(':id')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string) {
        await this.expenseService.remove(tenantId, id, userId);
    }
}
