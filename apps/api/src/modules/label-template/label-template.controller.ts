import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LabelTemplateService } from './label-template.service';
import { CreateLabelTemplateDto, UpdateLabelTemplateDto } from './dto/label-template.dto';
import { CurrentUser, TenantId } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Label Templates')
@Controller('label-templates')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class LabelTemplateController {
    constructor(private readonly labelTemplateService: LabelTemplateService) { }

    @Post()
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.SENIOR_SALES, UserRole.SALES_STAFF)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Etiket şablonu oluştur' })
    async create(
        @TenantId() tenantId: string,
        @Body() dto: CreateLabelTemplateDto,
        @CurrentUser('id') userId?: string,
    ) {
        return this.labelTemplateService.create(tenantId, dto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'Etiket şablonlarını listele' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'search', required: false })
    async list(
        @TenantId() tenantId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('search') search?: string,
    ) {
        return this.labelTemplateService.list(tenantId, { page, limit, search });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Etiket şablonu detayı' })
    async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
        return this.labelTemplateService.findOne(tenantId, id);
    }

    @Patch(':id')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.SENIOR_SALES, UserRole.SALES_STAFF)
    @ApiOperation({ summary: 'Etiket şablonunu güncelle' })
    async update(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @Body() dto: UpdateLabelTemplateDto,
        @CurrentUser('id') userId?: string,
    ) {
        return this.labelTemplateService.update(tenantId, id, dto, userId);
    }

    @Delete(':id')
    @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER, UserRole.SENIOR_SALES)
    @ApiOperation({ summary: 'Etiket şablonunu sil' })
    async remove(
        @TenantId() tenantId: string,
        @Param('id') id: string,
        @CurrentUser('id') userId?: string,
    ) {
        return this.labelTemplateService.remove(tenantId, id, userId);
    }
}
