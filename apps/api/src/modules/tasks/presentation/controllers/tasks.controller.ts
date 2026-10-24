import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TaskDto, TaskFormOptionsDto, TaskMatrixDto, TasksPageDto, TaskSummaryDto } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TaskViewerFactory } from '../../application/policies/task-viewer';
import { TaskApprovalService } from '../../application/services/task-approval.service';
import { TaskArchiveService } from '../../application/services/task-archive.service';
import { TaskObjectionService } from '../../application/services/task-objection.service';
import { TaskQueryService } from '../../application/services/task-query.service';
import { TaskSummaryService } from '../../application/services/task-summary.service';
import { TaskTimeService } from '../../application/services/task-time.service';
import { TaskTransitionService } from '../../application/services/task-transition.service';
import { TasksService } from '../../application/services/tasks.service';
import { AnswerObjectionBody, CreateTaskBody, DecideTaskBody, MatrixQueryDto, ObjectTaskBody, TimeEntryBody, TaskOptionsQueryDto, TasksQueryDto, TeamTasksQueryDto, TransitionTaskBody, UpdateTaskBody } from '../dtos/tasks.dtos';

/**
 * Every action has its own key. Moving a task is allowed to several people for different reasons (the assignee, the reviewer, whoever gave the task,
 * a manager of the team), each with its own key, so the route asks for the page key and the table of moves in the service checks the rest.
 * Anybody who may not see a task gets "not found".
 */
@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly queries: TaskQueryService,
    private readonly transitions: TaskTransitionService,
    private readonly approvals: TaskApprovalService,
    private readonly objections: TaskObjectionService,
    private readonly archive: TaskArchiveService,
    private readonly time: TaskTimeService,
    private readonly summary: TaskSummaryService,
    private readonly viewers: TaskViewerFactory,
  ) {}

  @Get()
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksView)
  async list(@Access() ctx: AccessContext, @Query() query: TasksQueryDto): Promise<TasksPageDto> {
    return this.queries.list(await this.viewers.of(ctx), query);
  }

  @Get('options')
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksCreate)
  async options(@Access() ctx: AccessContext, @Query() { search }: TaskOptionsQueryDto): Promise<TaskFormOptionsDto> {
    return this.tasks.formOptions(await this.viewers.of(ctx), search);
  }

  @Get('team')
  @HiddenWithPage('tasks-team')
  @RequirePermission(CorePermission.TasksTeamView)
  async team(@Access() ctx: AccessContext, @Query() query: TeamTasksQueryDto): Promise<TasksPageDto> {
    return this.queries.team(await this.viewers.of(ctx), query);
  }

  @Get('matrix')
  @HiddenWithPage('tasks-matrix')
  @RequirePermission(CorePermission.TasksMatrixView)
  async matrix(@Access() ctx: AccessContext, @Query() query: MatrixQueryDto): Promise<TaskMatrixDto> {
    return this.queries.matrix(await this.viewers.of(ctx), query);
  }

  @Get('summary')
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksView)
  async summaryOf(@Access() ctx: AccessContext): Promise<TaskSummaryDto> {
    return this.summary.summary(await this.viewers.of(ctx));
  }

  @Post()
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksCreate)
  async create(@Access() ctx: AccessContext, @Body() body: CreateTaskBody): Promise<TaskDto> {
    return this.tasks.create(await this.viewers.of(ctx), body);
  }

  @Get(':id')
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksView)
  async get(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<TaskDto> {
    return this.tasks.get(await this.viewers.of(ctx), id);
  }

  @Patch(':id')
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksUpdate)
  async update(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateTaskBody): Promise<TaskDto> {
    return this.tasks.update(await this.viewers.of(ctx), id, body);
  }

  @Post(':id/transition')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksView)
  async transition(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TransitionTaskBody): Promise<TaskDto> {
    return this.transitions.transition(await this.viewers.of(ctx), id, body);
  }

  @Post(':id/follow')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksFollow)
  async follow(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<TaskDto> {
    return this.tasks.follow(await this.viewers.of(ctx), id, true);
  }

  @Delete(':id/follow')
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksFollow)
  async unfollow(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<TaskDto> {
    return this.tasks.follow(await this.viewers.of(ctx), id, false);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksApprove)
  async approve(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: DecideTaskBody): Promise<TaskDto> {
    const viewer = await this.viewers.of(ctx);
    await this.approvals.approve(viewer, id, body);
    return this.tasks.get(viewer, id);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksReject)
  async reject(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: DecideTaskBody): Promise<TaskDto> {
    const viewer = await this.viewers.of(ctx);
    await this.approvals.reject(viewer, id, body);
    return this.tasks.get(viewer, id);
  }

  @Post(':id/resubmit')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksResubmit)
  async resubmit(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: DecideTaskBody): Promise<TaskDto> {
    const viewer = await this.viewers.of(ctx);
    await this.approvals.resubmit(viewer, id, body.revision);
    return this.tasks.get(viewer, id);
  }

  @Post(':id/objection')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksObject)
  async object(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: ObjectTaskBody): Promise<TaskDto> {
    const viewer = await this.viewers.of(ctx);
    await this.objections.object(viewer, id, body);
    return this.tasks.get(viewer, id);
  }

  @Post(':id/objection/answer')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksUpdate)
  async answerObjection(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: AnswerObjectionBody): Promise<TaskDto> {
    const viewer = await this.viewers.of(ctx);
    await this.objections.answer(viewer, id, body);
    return this.tasks.get(viewer, id);
  }

  @Post(':id/time')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksLogTime)
  async logTime(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TimeEntryBody): Promise<TaskDto> {
    return this.time.log(await this.viewers.of(ctx), id, body);
  }

  @Post(':id/restore')
  @HttpCode(200)
  @HiddenWithPage('tasks')
  @RequirePermission(CorePermission.TasksRestore)
  async restore(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<TaskDto> {
    return this.archive.restore(await this.viewers.of(ctx), id);
  }
}
