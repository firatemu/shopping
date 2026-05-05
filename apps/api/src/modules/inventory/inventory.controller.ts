import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { BulkStockAdjustmentDto, StockReservationDto } from './dto/inventory.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get('movements')
    @ApiOperation({ summary: 'Recent stock movements (tenant-wide)' })
    @ApiQuery({ name: 'limit', required: false }) @ApiQuery({ name: 'search', required: false })
    async listMovements(
        @TenantId() tenantId: string,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
    ) {
        return this.inventoryService.listRecentMovements(tenantId, { limit, search });
    }

    @Get('summary')
    @ApiOperation({ summary: 'Stock summary with pagination' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
    @ApiQuery({ name: 'search', required: false })
    @ApiQuery({ name: 'category', required: false })
    @ApiQuery({ name: 'brand', required: false })
    async getStockSummary(
        @TenantId() tenantId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('lowStockOnly') lowStockOnly?: boolean,
        @Query('search') search?: string,
        @Query('category') category?: string,
        @Query('brand') brand?: string,
    ) {
        return this.inventoryService.getStockSummary(tenantId, {
            page,
            limit,
            lowStockOnly,
            search,
            category,
            brand,
        });
    }

    @Get('alerts')
    @ApiOperation({ summary: 'Low stock alerts' })
    async getLowStockAlerts(@TenantId() tenantId: string) {
        return this.inventoryService.getLowStockAlerts(tenantId);
    }

    @Get('movements/:variantId')
    @ApiOperation({ summary: 'Stock movements for a variant' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    async getMovements(
        @TenantId() tenantId: string,
        @Param('variantId') variantId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.inventoryService.getMovements(tenantId, variantId, { page, limit });
    }

    @Patch('bulk-adjust')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Bulk stock adjustment — max 500 items' })
    async bulkAdjust(
        @TenantId() tenantId: string,
        @Body() dto: BulkStockAdjustmentDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.inventoryService.bulkAdjust(tenantId, dto, userId);
    }

    @Post('reserve')
    @ApiOperation({ summary: 'Reserve stock for cart' })
    async reserveStock(
        @TenantId() tenantId: string,
        @Body() dto: StockReservationDto,
        @CurrentUser('id') userId: string,
    ) {
        return this.inventoryService.reserveStock(tenantId, dto, userId);
    }

    @Post('release/:variantId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Release reserved stock' })
    async releaseStock(
        @TenantId() tenantId: string,
        @Param('variantId') variantId: string,
        @Body('quantity') quantity: number,
        @CurrentUser('id') userId: string,
    ) {
        return this.inventoryService.releaseStock(tenantId, variantId, quantity, userId);
    }
}
