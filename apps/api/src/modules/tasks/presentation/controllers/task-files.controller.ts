import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { TaskDto } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { sendOpenedFile, sendPreviewStream } from '../../../../core/files/presentation/send-file';
import { TaskViewerFactory } from '../../application/policies/task-viewer';
import { TaskFilesService } from '../../application/services/task-files.service';
import { TasksService } from '../../application/services/tasks.service';
import { AddTaskFilesBody, TaskFileParam } from '../dtos/tasks.dtos';

/**
 * The files of a task: reference files (given by who makes or edits the task), delivery files (handed in by who does the work) and their removal, each
 * with its own key. Reading a file follows the right to see the task (anybody else gets "not found").
 */
@ApiTags('tasks')
@Controller('tasks/:id')
export class TaskFilesController {
  constructor(
    private readonly files: TaskFilesService,
    private readonly tasks: TasksService,
    private readonly viewers: TaskViewerFactory,
  ) {}

  @Post('files')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksFileAdd)
  async addReference(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: AddTaskFilesBody): Promise<TaskDto> {
    const viewer = await this.viewers.of(ctx);
    await this.files.addReference(viewer, id, body);
    return this.tasks.get(viewer, id);
  }

  @Post('deliveries')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksFileDeliver)
  async deliver(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: AddTaskFilesBody): Promise<TaskDto> {
    const viewer = await this.viewers.of(ctx);
    await this.files.deliver(viewer, id, body);
    return this.tasks.get(viewer, id);
  }

  @Delete('files/:fileId')
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksFileRemove)
  async remove(@Access() ctx: AccessContext, @Param() { id, fileId }: TaskFileParam): Promise<TaskDto> {
    const viewer = await this.viewers.of(ctx);
    await this.files.remove(viewer, id, fileId);
    return this.tasks.get(viewer, id);
  }

  @Get('files/:fileId/preview')
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksView)
  async preview(@Access() ctx: AccessContext, @Param() { id, fileId }: TaskFileParam, @Res() res: Response): Promise<void> {
    const { file, stream } = await this.files.preview(await this.viewers.of(ctx), id, fileId);
    sendPreviewStream(res, file, stream);
  }

  @Get('files/:fileId')
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksView)
  async open(@Access() ctx: AccessContext, @Param() { id, fileId }: TaskFileParam, @Res() res: Response): Promise<void> {
    const { file, opened } = await this.files.open(await this.viewers.of(ctx), id, fileId);
    sendOpenedFile(res, file, opened);
  }
}
