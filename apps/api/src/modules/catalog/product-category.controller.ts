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
import { ProductCategoryService } from './product-category.service';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProductCategoryDto, UpdateProductCategoryDto } from './dto/catalog.dto';

@ApiTags('Catalog — Categories')
@Controller('catalog/categories')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ProductCategoryController {
  constructor(private readonly service: ProductCategoryService) {}

  @Get()
  @ApiOperation({ summary: 'List product categories (flat, build tree on client)' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Create category' })
  create(@TenantId() tenantId: string, @Body() dto: CreateProductCategoryDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
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
