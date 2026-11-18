import { CorePermission, type TaskFollowerDto } from '@arweqah-platform/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TaskViewerFactory } from '../../application/policies/task-viewer';
import { TaskFollowersService } from '../../application/services/task-followers.service';
import { AddTaskFollowersBody, TaskFollowerCandidatesQueryDto } from '../dtos/tasks.dtos';

const FollowerParam = z.object({ id: z.uuid(), userId: z.uuid() });

/** The followers of a task chosen by its assignee, its giver or a manager (FR-163). The service checks the relation to the task; the key lets the call exist. */
@ApiTags('tasks')
@Controller('tasks/:id/followers')
@HiddenWithPage('tasks')
export class TaskFollowersController {
  constructor(
    private readonly followers: TaskFollowersService,
    private readonly viewers: TaskViewerFactory,
  ) {}

  @Get()
  @RequirePermission(CorePermission.TasksFollowersManage)
  async list(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<TaskFollowerDto[]> {
    return this.followers.list(await this.viewers.of(ctx), id);
  }

  @Get('candidates')
  @RequirePermission(CorePermission.TasksFollowersManage)
  async candidates(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Query() query: TaskFollowerCandidatesQueryDto): Promise<TaskFollowerDto[]> {
    return this.followers.candidates(await this.viewers.of(ctx), id, query.search);
  }

  @Post()
  @HttpCode(200)
  @RequirePermission(CorePermission.TasksFollowersManage)
  async add(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: AddTaskFollowersBody): Promise<TaskFollowerDto[]> {
    return this.followers.add(await this.viewers.of(ctx), id, body);
  }

  @Delete(':userId')
  @RequirePermission(CorePermission.TasksFollowersManage)
  async remove(@Access() ctx: AccessContext, @Param() params: Record<string, string>): Promise<TaskFollowerDto[]> {
    const { id, userId } = FollowerParam.parse(params);
    return this.followers.remove(await this.viewers.of(ctx), id, userId);
  }
}
