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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ExpenseService } from './expense.service';
import { CreateExpenseCategoryDto, CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post('categories')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Gelir veya gider kategorisi oluştur' })
  async createCategory(@TenantId() tenantId: string, @Body() dto: CreateExpenseCategoryDto) {
    return this.expenseService.createCategory(tenantId, dto.name, dto.kind);
  }

  @Get('categories/:categoryId/report')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Kategoriye göre tarih aralığı raporu' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async categoryReport(
    @TenantId() tenantId: string,
    @Param('categoryId') categoryId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.expenseService.categoryReport(tenantId, categoryId, dateFrom, dateTo);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Kategori listesi (kind=INCOME|EXPENSE ile filtre)' })
  @ApiQuery({ name: 'kind', required: false, enum: ['INCOME', 'EXPENSE'] })
  async listCategories(@TenantId() tenantId: string, @Query('kind') kind?: 'INCOME' | 'EXPENSE') {
    return this.expenseService.listCategories(tenantId, kind);
  }

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Gelir veya gider kaydı oluştur (categoryId zorunlu)' })
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateExpenseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.expenseService.create(tenantId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Kayıt listesi' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @TenantId() tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.expenseService.findAll(tenantId, {
      page,
      limit,
      type,
      categoryId,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get('summary')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Dönem özeti (categoriesBreakdown ile kategori bazlı gelir/gider)' })
  @ApiQuery({ name: 'dateFrom', required: true })
  @ApiQuery({ name: 'dateTo', required: true })
  async getSummary(
    @TenantId() tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.expenseService.getSummary(tenantId, { dateFrom, dateTo });
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.expenseService.findById(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.ACCOUNTANT)
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.expenseService.update(tenantId, id, dto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.expenseService.remove(tenantId, id, userId);
  }
}
