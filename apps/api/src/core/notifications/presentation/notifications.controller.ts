import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { notificationsQuerySchema, type NotificationDto, type Paginated } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../common/presentation/request-context';
import { NotificationsService } from '../application/notifications.service';

class NotificationsQueryDto extends createZodDto(notificationsQuerySchema) {}
class MarkReadDto extends createZodDto(z.strictObject({ ids: z.array(z.uuid()).min(1).max(100) })) {}

/** security: self-scoped. Every user reads only their own notifications, so no permission key is needed. */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: SessionUser, @Query() query: NotificationsQueryDto): Promise<Paginated<NotificationDto>> {
    return this.notifications.list(user.id, query);
  }

  @Get('unread-count')
  async unread(@CurrentUser() user: SessionUser): Promise<{ count: number }> {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Post('read')
  @HttpCode(200)
  async markRead(@CurrentUser() user: SessionUser, @Body() body: MarkReadDto): Promise<{ updated: number }> {
    return { updated: await this.notifications.markRead(user.id, body.ids) };
  }

  @Post('read-all')
  @HttpCode(200)
  async markAllRead(@CurrentUser() user: SessionUser): Promise<{ updated: number }> {
    return { updated: await this.notifications.markRead(user.id, 'all') };
  }
}
