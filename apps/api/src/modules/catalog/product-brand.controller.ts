import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductBrandService } from './product-brand.service';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProductBrandDto, UpdateProductBrandDto } from './dto/catalog.dto';

@ApiTags('Catalog — Brands')
@Controller('catalog/brands')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ProductBrandController {
    constructor(private readonly service: ProductBrandService) { }

    @Get()
    @ApiOperation({ summary: 'List brands' })
    findAll(@TenantId() tenantId: string) {
        return this.service.findAll(tenantId);
    }

    @Post()
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    create(@TenantId() tenantId: string, @Body() dto: CreateProductBrandDto) {
        return this.service.create(tenantId, dto);
    }

    @Put(':id')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    update(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Body() dto: UpdateProductBrandDto,
    ) {
        return this.service.update(tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @CurrentUser('id') userId: string,
    ) {
        await this.service.remove(tenantId, id, userId);
    }
}
