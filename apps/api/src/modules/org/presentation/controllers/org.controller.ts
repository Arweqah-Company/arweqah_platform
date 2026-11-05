/**
 * The group-wide organization structure. One tree for the whole group; every route below is under `/api/org`.
 *
 *   GET    /tree?view=team|full&asCompany=<id>  OrgTreeDto            org.view (team: the viewer's own company, never a parameter);
 *                                                                      view=full and asCompany need org.view_full (403 otherwise)
 *   GET    /levels                              OrgLevelsDto           org.view: the unit types and the «who may be created under whom» table
 *   PUT    /levels            SaveLevelsBody    OrgLevelsDto           org.levels_manage (admin mode): names, accepts titles, add / remove added types
 *   PUT    /levels/rules      SaveLevelRulesBody OrgLevelsDto          org.levels_manage (admin mode): replace the rules table (fixed rules: 422 INVALID_ORG_RULES)
 *   POST   /nodes             CreateNodeBody    OrgNodeDto             org.unit_create (admin mode): type must be allowed under the parent; code is generated
 *   PUT    /nodes/:id         UpdateNodeBody    OrgNodeDto             org.unit_update (admin mode)
 *   PUT    /nodes/:id/code    SetNodeCodeBody   OrgNodeDto             org.unit_update (admin mode): only for a unit that has no code yet
 *   POST   /nodes/:id/move    MoveNodeBody      OrgNodeDto             org.unit_move (admin mode)
 *   POST   /nodes/:id/management-mode ChangeModeBody ChangeManagementModeResultDto  org.unit_share (admin mode): {mode, reason}; returns the impact
 *   DELETE /nodes/:id                                                  org.unit_delete (admin mode)
 *   GET    /nodes/:id/versions                  OrgNodeVersionsDto     org.view: the unit's dated versions (past, current, scheduled) and its change log; a unit the viewer does not see is 404
 *   PUT    /nodes/:id/charter UpdateCharterBody OrgNodeVersionsDto     org.charter_edit (admin mode): {purpose, outputs, inScope, outOfScope, limits, effectiveFrom?, reason}
 *   GET    /nodes/:id/leaders                   OrgNodeLeadersDto      org.view: leaders and acting leaders per company, and where the manager goes when a company has none
 *   PUT    /nodes/:id/leaders SetLeaderBody     OrgNodeLeadersDto      org.leaders_manage (admin mode): {companyId, employeeId, kind, validFrom, validTo?, reason}
 *   POST   /nodes/:id/leaders/:leaderId/end EndLeaderBody OrgNodeLeadersDto org.leaders_manage (admin mode): ends a leader in force on endDate
 *   DELETE /nodes/:id/leaders/:leaderId                OrgNodeLeadersDto  org.leaders_manage (admin mode): only a row that has not started (422 ORG_LEADER_NOT_PENDING)
 *   POST   /nodes/:id/job-titles AddTitlesBody  JobTitleDto[]          job_titles.create (admin mode): grade and track required
 *   PUT    /job-titles/:id    UpdateTitleBody   JobTitleDto            job_titles.update (admin mode)
 *   DELETE /job-titles/:id                                             job_titles.delete (admin mode)
 * The job-titles page (list, card, content, import, stage rules) is `JobTitlesController`.
 *
 * Every unit belongs to the group company; an out-of-reach company is a 404, a missing permission a 403.
 */
import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ChangeManagementModeResultDto, JobTitleDto, OrgLevelsDto, OrgNodeDto, OrgNodeLeadersDto, OrgNodeVersionsDto, OrgTreeDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { JOB_TITLES_CREATE, JOB_TITLES_DELETE, JOB_TITLES_UPDATE, ORG_CHARTER_EDIT, ORG_LEADERS_MANAGE, ORG_LEVELS, ORG_UNIT_CREATE, ORG_UNIT_DELETE, ORG_UNIT_MOVE, ORG_UNIT_SHARE, ORG_UNIT_UPDATE, ORG_VIEW } from '../../application/policies/org-access.policy';
import { OrgLeadersService } from '../../application/services/org-leaders.service';
import { OrgVersionsService } from '../../application/services/org-versions.service';
import { OrgLevelsService } from '../../application/services/org-levels.service';
import { OrgNodesService } from '../../application/services/org-nodes.service';
import { OrgTreeService } from '../../application/services/org-tree.service';
import { AddTitlesBody, ChangeModeBody, CreateNodeBody, EndLeaderBody, LeaderParam, MoveNodeBody, OrgTreeQueryDto, SaveLevelRulesBody, SaveLevelsBody, SetLeaderBody, SetNodeCodeBody, UpdateCharterBody, UpdateNodeBody, UpdateTitleBody } from '../dtos/org.dtos';

@ApiTags('org')
@Controller('org')
@HiddenWithPage('org')
export class OrgController {
  constructor(
    private readonly levels: OrgLevelsService,
    private readonly nodes: OrgNodesService,
    private readonly tree: OrgTreeService,
    private readonly versions: OrgVersionsService,
    private readonly leaders: OrgLeadersService,
  ) {}

  @Get('tree')
  @RequirePermission(ORG_VIEW)
  getTree(@Access() ctx: AccessContext, @Query() query: OrgTreeQueryDto): Promise<OrgTreeDto> {
    return this.tree.tree(ctx, query);
  }

  @Get('levels')
  @RequirePermission(ORG_VIEW)
  listLevels(): Promise<OrgLevelsDto> {
    return this.levels.list();
  }

  @Put('levels')
  @RequireAdminMode()
  @RequirePermission(ORG_LEVELS)
  saveLevels(@Body() body: SaveLevelsBody, @CurrentUser() user: SessionUser): Promise<OrgLevelsDto> {
    return this.levels.save(body, user.id);
  }

  @Put('levels/rules')
  @RequireAdminMode()
  @RequirePermission(ORG_LEVELS)
  saveLevelRules(@Body() body: SaveLevelRulesBody, @CurrentUser() user: SessionUser): Promise<OrgLevelsDto> {
    return this.levels.saveRules(body, user.id);
  }

  @Post('nodes')
  @RequireAdminMode()
  @RequirePermission(ORG_UNIT_CREATE)
  createNode(@Access() ctx: AccessContext, @Body() body: CreateNodeBody, @CurrentUser() user: SessionUser): Promise<OrgNodeDto> {
    return this.nodes.createNode(ctx, body, user.id);
  }

  @Put('nodes/:id')
  @RequireAdminMode()
  @RequirePermission(ORG_UNIT_UPDATE)
  updateNode(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateNodeBody, @CurrentUser() user: SessionUser): Promise<OrgNodeDto> {
    return this.nodes.updateNode(ctx, id, body, user.id);
  }

  @Put('nodes/:id/code')
  @RequireAdminMode()
  @RequirePermission(ORG_UNIT_UPDATE)
  setCode(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: SetNodeCodeBody, @CurrentUser() user: SessionUser): Promise<OrgNodeDto> {
    return this.nodes.setCode(ctx, id, body, user.id);
  }

  @Post('nodes/:id/move')
  @HttpCode(200)
  @RequireAdminMode()
  @RequirePermission(ORG_UNIT_MOVE)
  moveNode(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: MoveNodeBody, @CurrentUser() user: SessionUser): Promise<OrgNodeDto> {
    return this.nodes.moveNode(ctx, id, body, user.id);
  }

  @Post('nodes/:id/management-mode')
  @HttpCode(200)
  @RequireAdminMode()
  @RequirePermission(ORG_UNIT_SHARE)
  changeMode(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: ChangeModeBody, @CurrentUser() user: SessionUser): Promise<ChangeManagementModeResultDto> {
    return this.nodes.changeMode(ctx, id, body, user.id);
  }

  @Delete('nodes/:id')
  @HttpCode(204)
  @RequireAdminMode()
  @RequirePermission(ORG_UNIT_DELETE)
  async removeNode(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.nodes.removeNode(ctx, id, user.id);
  }

  @Get('nodes/:id/versions')
  @RequirePermission(ORG_VIEW)
  getVersions(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<OrgNodeVersionsDto> {
    return this.versions.get(ctx, id);
  }

  @Put('nodes/:id/charter')
  @RequireAdminMode()
  @RequirePermission(ORG_CHARTER_EDIT)
  updateCharter(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateCharterBody, @CurrentUser() user: SessionUser): Promise<OrgNodeVersionsDto> {
    return this.versions.updateCharter(ctx, id, body, user.id);
  }

  @Get('nodes/:id/leaders')
  @RequirePermission(ORG_VIEW)
  getLeaders(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<OrgNodeLeadersDto> {
    return this.leaders.list(ctx, id);
  }

  @Put('nodes/:id/leaders')
  @RequireAdminMode()
  @RequirePermission(ORG_LEADERS_MANAGE)
  setLeader(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: SetLeaderBody, @CurrentUser() user: SessionUser): Promise<OrgNodeLeadersDto> {
    return this.leaders.set(ctx, id, body, user.id);
  }

  @Post('nodes/:id/leaders/:leaderId/end')
  @HttpCode(200)
  @RequireAdminMode()
  @RequirePermission(ORG_LEADERS_MANAGE)
  endLeader(@Access() ctx: AccessContext, @Param() { id, leaderId }: LeaderParam, @Body() body: EndLeaderBody, @CurrentUser() user: SessionUser): Promise<OrgNodeLeadersDto> {
    return this.leaders.end(ctx, { nodeId: id, leaderId }, body, user.id);
  }

  @Delete('nodes/:id/leaders/:leaderId')
  @HttpCode(200)
  @RequireAdminMode()
  @RequirePermission(ORG_LEADERS_MANAGE)
  removeLeader(@Access() ctx: AccessContext, @Param() { id, leaderId }: LeaderParam, @CurrentUser() user: SessionUser): Promise<OrgNodeLeadersDto> {
    return this.leaders.remove(ctx, { nodeId: id, leaderId }, user.id);
  }

  @Post('nodes/:id/job-titles')
  @RequireAdminMode()
  @RequirePermission(JOB_TITLES_CREATE)
  addTitles(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: AddTitlesBody, @CurrentUser() user: SessionUser): Promise<JobTitleDto[]> {
    return this.nodes.addTitles(ctx, id, body, user.id);
  }

  @Put('job-titles/:id')
  @RequireAdminMode()
  @RequirePermission(JOB_TITLES_UPDATE)
  updateTitle(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateTitleBody, @CurrentUser() user: SessionUser): Promise<JobTitleDto> {
    return this.nodes.updateTitle(ctx, id, body, user.id);
  }

  @Delete('job-titles/:id')
  @HttpCode(204)
  @RequireAdminMode()
  @RequirePermission(JOB_TITLES_DELETE)
  async removeTitle(@Access() ctx: AccessContext, @Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<void> {
    await this.nodes.removeTitle(ctx, id, user.id);
  }
}
