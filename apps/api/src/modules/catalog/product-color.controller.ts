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
import { ProductColorService } from './product-color.service';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateProductColorDto, UpdateProductColorDto } from './dto/catalog.dto';

@ApiTags('Catalog — Colors')
@Controller('catalog/colors')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ProductColorController {
  constructor(private readonly service: ProductColorService) {}

  @Get()
  @ApiOperation({ summary: 'List master colors' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  create(@TenantId() tenantId: string, @Body() dto: CreateProductColorDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductColorDto,
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
