import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IntegrationService } from './integration.service';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@Roles(UserRole.TENANT_ADMIN)
@ApiBearerAuth()
export class IntegrationController {
    constructor(private readonly integrationService: IntegrationService) { }

    @Post('connect')
    @ApiOperation({ summary: 'Connect integration' })
    async connect(@TenantId() tenantId: string, @Body() dto: { type: string; config: Record<string, any> }) {
        return this.integrationService.connect(tenantId, dto);
    }

    @Post(':type/disconnect')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disconnect integration' })
    async disconnect(@TenantId() tenantId: string, @Param('type') type: string) {
        return this.integrationService.disconnect(tenantId, type);
    }

    @Post(':type/pause')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Pause integration' })
    async pause(@TenantId() tenantId: string, @Param('type') type: string) {
        return this.integrationService.pause(tenantId, type);
    }

    @Get()
    @ApiOperation({ summary: 'List integrations' })
    async findAll(@TenantId() tenantId: string) {
        return this.integrationService.findAll(tenantId);
    }

    @Get(':type/status')
    @ApiOperation({ summary: 'Integration status' })
    async getStatus(@TenantId() tenantId: string, @Param('type') type: string) {
        return this.integrationService.getStatus(tenantId, type);
    }
}
