import {
    Controller, Get, Post, Put, Delete,
    Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto, CreatePaymentDto, CustomerTypeEnum } from './dto/customer.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class CustomerController {
    constructor(private readonly customerService: CustomerService) { }

    @Post()
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Create customer' })
    async create(
        @TenantId() tenantId: string, @Body() dto: CreateCustomerDto, @CurrentUser('id') userId: string,
    ) { return this.customerService.create(tenantId, dto, userId); }

    @Get()
    @ApiOperation({ summary: 'List customers with search' })
    @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'type', required: false, enum: CustomerTypeEnum })
    async findAll(
        @TenantId() tenantId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
        @Query('type') type?: CustomerTypeEnum,
    ) {
        return this.customerService.findAll(tenantId, { page, limit, search, type });
    }

    @Get('overdue')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Get overdue customers' })
    async getOverdue(@TenantId() tenantId: string) {
        return this.customerService.getOverdueCustomers(tenantId);
    }

    /** Static path before :id — list historic orders for customer (POS geçmişi). */
    @Get(':id/orders')
    @ApiOperation({ summary: 'List completed orders for customer' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async listCustomerOrders(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.customerService.listCustomerOrders(tenantId, id, { page, limit });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get customer by ID' })
    async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.customerService.findById(tenantId, id);
    }

    @Put(':id')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
    @ApiOperation({ summary: 'Update customer' })
    async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser('id') userId: string) {
        return this.customerService.update(tenantId, id, dto, userId);
    }

    @Delete(':id')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft delete customer' })
    async remove(@TenantId() tenantId: string, @Param('id') id: string, @CurrentUser('id') userId: string) {
        await this.customerService.remove(tenantId, id, userId);
    }

    @Post('payments')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT, UserRole.CASHIER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Record payment (tahsilat)' })
    async recordPayment(@TenantId() tenantId: string, @Body() dto: CreatePaymentDto, @CurrentUser('id') userId: string) {
        return this.customerService.recordPayment(tenantId, dto, userId);
    }

    @Get(':id/statement')
    @ApiOperation({ summary: 'Customer statement (hesap ekstresi)' })
    @ApiQuery({ name: 'dateFrom', required: false }) @ApiQuery({ name: 'dateTo', required: false })
    @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
    async getStatement(
        @TenantId() tenantId: string, @Param('id') customerId: string,
        @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string,
        @Query('page') page?: number, @Query('limit') limit?: number,
    ) { return this.customerService.getStatement(tenantId, customerId, { dateFrom, dateTo, page, limit }); }

    @Get(':id/summary')
    @ApiOperation({ summary: 'Customer summary (özet)' })
    @ApiQuery({ name: 'dateFrom', required: false }) @ApiQuery({ name: 'dateTo', required: false })
    async getSummary(
        @TenantId() tenantId: string,
        @Param('id') customerId: string,
        @Query('dateFrom') dateFrom?: string,
        @Query('dateTo') dateTo?: string,
    ) {
        return this.customerService.getSummary(tenantId, customerId, { dateFrom, dateTo });
    }
}
