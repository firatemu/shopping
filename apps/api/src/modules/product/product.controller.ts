import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  CreateVariantDto,
  BulkCreateVariantsDto,
  UpdateProductDto,
  BarcodeSearchDto,
} from './dto/product.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Throttle } from '../../common/decorators/throttle.decorator';
import { UserRole } from '../../common/guards/rbac.guard';

@ApiTags('Products')
@Controller('products')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Create product with optional variants' })
  @ApiResponse({ status: 201, description: 'Product created' })
  async create(
    @Body() dto: CreateProductDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productService.create(tenantId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'brand', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @TenantId() tenantId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('category') category?: string,
    @Query('brand') brand?: string,
    @Query('search') search?: string,
  ) {
    return this.productService.findAll(tenantId, {
      page,
      limit,
      category,
      brand,
      search,
    });
  }

  @Get('variants')
  @ApiOperation({ summary: 'List all product variants (paginated, flat)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listVariants(
    @TenantId() tenantId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.productService.findAllVariants(tenantId, {
      page,
      limit,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID with variants' })
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.productService.findById(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Update product' })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productService.update(tenantId, id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete product and its variants' })
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.productService.remove(tenantId, id, userId);
  }

  @Post(':id/variants')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.SENIOR_SALES)
  @ApiOperation({ summary: 'Add variant to existing product' })
  async addVariant(
    @TenantId() tenantId: string,
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productService.addVariant(tenantId, productId, dto, userId);
  }

  @Post(':id/variants/bulk')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.SENIOR_SALES)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk-create variants: colors × size-set' })
  async bulkCreateVariants(
    @TenantId() tenantId: string,
    @Param('id') productId: string,
    @Body() dto: BulkCreateVariantsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.productService.bulkCreateVariants(tenantId, productId, dto, userId);
  }

  @Post('barcodes/lookup')
  @HttpCode(HttpStatus.OK)
  @Throttle('BARCODE')
  @ApiOperation({ summary: 'Barcode lookup — target <50ms p95' })
  async lookupBarcode(@TenantId() tenantId: string, @Body() dto: BarcodeSearchDto) {
    return this.productService.lookupBarcode(tenantId, dto.barcode);
  }
}
