import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type JobTitleDto,
  type OrgLevelDto,
  type OrgLevelsPreviewDto,
  type OrgNodeDto,
  type OrgTreeDto,
} from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { assertCompanyAccess, ORG_MANAGE, ORG_VIEW } from '../../application/policies/org-access.policy';
import { OrgLevelsService } from '../../application/services/org-levels.service';
import { OrgNodesService } from '../../application/services/org-nodes.service';
import { AddTitlesBody, CopyLevelsBody, CreateNodeBody, MoveNodeBody, PreviewLevelsBody, SaveLevelsBody, UpdateNodeBody, UpdateTitleBody } from '../dtos/org.dtos';


@ApiTags('org')
@Controller('org')
@HiddenWithPage('org')
export class OrgController {
  constructor(
    private readonly levels: OrgLevelsService,
    private readonly nodes: OrgNodesService,
  ) {}

  @Get('companies/:id/tree')
  @RequirePermission(ORG_VIEW)
  tree(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<OrgTreeDto> {
    return this.nodes.tree(ctx, id);
  }

  /** Dry run of the levels form: what would be removed or detached. Nothing changes. */
  @Post('levels/preview')
  @HttpCode(200)
  @RequirePermission(ORG_MANAGE)
  previewLevels(@Access() ctx: AccessContext, @Body() body: PreviewLevelsBody): Promise<OrgLevelsPreviewDto> {
    assertCompanyAccess(ctx, ORG_MANAGE, body.companyId);
    return this.levels.preview(body);
  }

  @Post('levels')
  @HttpCode(200)
  @RequirePermission(ORG_MANAGE)
  saveLevels(@Access() ctx: AccessContext, @Body() body: SaveLevelsBody, @CurrentUser() user: SessionUser): Promise<OrgLevelDto[]> {
    assertCompanyAccess(ctx, ORG_MANAGE, body.companyId);
    return this.levels.save(body, user.id);
  }

  @Post('levels/copy')
  @HttpCode(200)
  @RequirePermission(ORG_MANAGE)
  copyLevels(@Access() ctx: AccessContext, @Body() body: CopyLevelsBody, @CurrentUser() user: SessionUser): Promise<OrgLevelDto[]> {
    assertCompanyAccess(ctx, ORG_MANAGE, body.toCompanyId);
    assertCompanyAccess(ctx, ORG_VIEW, body.fromCompanyId);
    return this.levels.copy(body, user.id);
  }

  @Post('nodes')
  @RequirePermission(ORG_MANAGE)
  createNode(@Access() ctx: AccessContext, @Body() body: CreateNodeBody, @CurrentUser() user: SessionUser): Promise<OrgNodeDto> {
    return this.nodes.createNode(ctx, body, user.id);
  }

  @Put('nodes/:id')
  @RequirePermission(ORG_MANAGE)
  updateNode(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateNodeBody, @CurrentUser() user: SessionUser): Promise<OrgNodeDto> {
    return this.nodes.updateNode(ctx, id, body, user.id);
  }

  @Post('nodes/:id/move')
  @HttpCode(200)
  @RequirePermission(ORG_MANAGE)
  moveNode(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: MoveNodeBody, @CurrentUser() user: SessionUser): Promise<OrgNodeDto> {
    return this.nodes.moveNode(ctx, id, body, user.id);
  }

  @Delete('nodes/:id')
  @HttpCode(204)
  @RequirePermission(ORG_MANAGE)
  async removeNode(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.nodes.removeNode(ctx, id, user.id);
  }

  @Post('nodes/:id/job-titles')
  @RequirePermission(ORG_MANAGE)
  addTitles(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: AddTitlesBody, @CurrentUser() user: SessionUser): Promise<JobTitleDto[]> {
    return this.nodes.addTitles(ctx, id, body, user.id);
  }

  @Put('job-titles/:id')
  @RequirePermission(ORG_MANAGE)
  updateTitle(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateTitleBody, @CurrentUser() user: SessionUser): Promise<JobTitleDto> {
    return this.nodes.updateTitle(ctx, id, body, user.id);
  }

  @Delete('job-titles/:id')
  @HttpCode(204)
  @RequirePermission(ORG_MANAGE)
  async removeTitle(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.nodes.removeTitle(ctx, id, user.id);
  }
}
