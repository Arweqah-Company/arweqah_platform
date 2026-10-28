import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CommentRulesDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TaskCommentRulesService } from '../../application/services/task-comment-rules.service';
import { CommentRulesBody, TagsQueryDto } from '../dtos/tasks.dtos';

/** Who may do what in the conversations of tasks: an administrator page (with the task policies), so platform admin mode is required. */
@ApiTags('tasks')
@Controller('task-comment-rules')
@HiddenWithPage('task-policies')
@RequireAdminMode()
export class TaskCommentRulesController {
  constructor(private readonly rules: TaskCommentRulesService) {}

  @Get()
  @RequirePermission(CorePermission.TasksCommentRulesView)
  get(@Access() ctx: AccessContext, @Query() { companyId }: TagsQueryDto): Promise<CommentRulesDto> {
    return this.rules.get(companyId, ctx.placement.companyId);
  }

  @Put()
  @RequirePermission(CorePermission.TasksCommentRulesEdit)
  update(@Access() ctx: AccessContext, @Query() { companyId }: TagsQueryDto, @Body() body: CommentRulesBody): Promise<CommentRulesDto> {
    return this.rules.update(ctx.userId, companyId, ctx.placement.companyId, body);
  }
}
