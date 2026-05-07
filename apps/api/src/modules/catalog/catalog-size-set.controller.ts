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
import { CatalogSizeSetService } from './catalog-size-set.service';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSizeSetDto, UpdateSizeSetDto } from './dto/catalog.dto';

@ApiTags('Catalog — Size sets')
@Controller('catalog/size-sets')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class CatalogSizeSetController {
  constructor(private readonly service: CatalogSizeSetService) {}

  @Get()
  @ApiOperation({ summary: 'List size sets' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  create(@TenantId() tenantId: string, @Body() dto: CreateSizeSetDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateSizeSetDto) {
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
