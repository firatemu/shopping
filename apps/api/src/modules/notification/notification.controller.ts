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
import { NotificationService } from './notification.service';
import { TenantId, CurrentUser } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard, UserRole } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'), TenantGuard, RbacGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'My notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMyNotifications(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationService.getMyNotifications(tenantId, userId, {
      unreadOnly,
      page,
      limit,
    });
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.notificationService.markAsRead(tenantId, userId, id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all as read' })
  async markAllAsRead(@TenantId() tenantId: string, @CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(tenantId, userId);
  }

  @Post('send')
  @Roles(UserRole.TENANT_ADMIN, UserRole.STORE_MANAGER)
  @ApiOperation({ summary: 'Send notification to user(s)' })
  async send(
    @TenantId() tenantId: string,
    @Body() dto: { userIds: string[]; title: string; body: string },
  ) {
    return this.notificationService.createBulk(tenantId, dto.userIds, dto.title, dto.body);
  }
}
