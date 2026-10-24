import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TaskDepartmentOptionDto, TaskTagAdminDto } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TaskTagService } from '../../application/services/task-tag.service';
import { TaskTagBody } from '../dtos/tasks.dtos';

/** Each department keeps its own tags; the scope of each key says which departments a person works on. A department out of reach is "not found". */
@ApiTags('tasks')
@Controller('task-tags')
@HiddenWithPage('task-tags')
export class TaskTagsController {
  constructor(private readonly tags: TaskTagService) {}

  @Get()
  @RequirePermission(CorePermission.TasksTagsView)
  list(@Access() ctx: AccessContext): Promise<TaskTagAdminDto[]> {
    return this.tags.list(ctx);
  }

  @Get('departments')
  @RequirePermission(CorePermission.TasksTagCreate)
  departments(@Access() ctx: AccessContext): Promise<TaskDepartmentOptionDto[]> {
    return this.tags.departments(ctx);
  }

  @Post()
  @RequirePermission(CorePermission.TasksTagCreate)
  create(@Access() ctx: AccessContext, @Body() body: TaskTagBody): Promise<TaskTagAdminDto> {
    return this.tags.create(ctx, body);
  }

  @Put(':id')
  @RequirePermission(CorePermission.TasksTagUpdate)
  update(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TaskTagBody): Promise<TaskTagAdminDto> {
    return this.tags.update(ctx, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(CorePermission.TasksTagDelete)
  async remove(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<void> {
    await this.tags.remove(ctx, id);
  }
}
