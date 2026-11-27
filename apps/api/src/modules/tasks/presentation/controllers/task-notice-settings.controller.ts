import { CorePermission, type TaskNoticeSettings } from '@arweqah-platform/shared';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TaskNoticeSettingsService } from '../../application/services/task-notice-settings.service';
import { TaskNoticeSettingsBody } from '../dtos/tasks.dtos';

/** A person's own choices for the task summary and reminders: the channel, the summary hour, and whether to be reminded. */
@ApiTags('tasks')
@Controller('task-notice-settings')
export class TaskNoticeSettingsController {
  constructor(private readonly settings: TaskNoticeSettingsService) {}

  @Get()
  @RequirePermission(CorePermission.TasksNoticeSettings)
  get(@Access() ctx: AccessContext): Promise<TaskNoticeSettings> {
    return this.settings.get(ctx.userId);
  }

  @Put()
  @RequirePermission(CorePermission.TasksNoticeSettings)
  update(@Access() ctx: AccessContext, @Body() body: TaskNoticeSettingsBody): Promise<TaskNoticeSettings> {
    return this.settings.update(ctx.userId, body);
  }
}
