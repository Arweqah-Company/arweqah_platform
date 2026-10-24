import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { TaskPolicyDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { TaskPolicyService } from '../../application/services/task-policy.service';
import { TagsQueryDto, TaskPolicyBody } from '../dtos/tasks.dtos';

/** The rules of tasks for a company: an administrator page, so platform admin mode is required. */
@ApiTags('tasks')
@Controller('task-policies')
@HiddenWithPage('task-policies')
@RequireAdminMode()
export class TaskPoliciesController {
  constructor(private readonly policies: TaskPolicyService) {}

  @Get()
  @RequirePermission(CorePermission.TasksPoliciesView)
  get(@Access() ctx: AccessContext, @Query() { companyId }: TagsQueryDto): Promise<TaskPolicyDto> {
    return this.policies.dto(companyId, ctx.placement.companyId);
  }

  @Put()
  @RequirePermission(CorePermission.TasksPoliciesEdit)
  update(@Access() ctx: AccessContext, @Query() { companyId }: TagsQueryDto, @Body() body: TaskPolicyBody): Promise<TaskPolicyDto> {
    return this.policies.update(ctx.userId, companyId, ctx.placement.companyId, body);
  }
}
