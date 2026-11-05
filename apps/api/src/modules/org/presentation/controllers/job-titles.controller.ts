/**
 * The job-titles page (FR-104…FR-107). Every route is under `/api/org` and is hidden with the `job-titles` page.
 *
 *   GET    /job-titles?search&orgNodeId&sectorId&departmentId&sectionId&grade&track&vacant&page&pageSize   JobTitlesPageDto   job_titles.view: only the units the viewer sees
 *   GET    /job-titles/:id/card?company=<id>        JobTitleCardDto       job_titles.view: another company than the viewer's needs org.view_full (403)
 *   PUT    /job-titles/:id/content UpdateTitleContentBody JobTitleContentDto org.titles_edit_content (admin mode): bumps the content version
 *   POST   /job-titles/bulk        ImportTitlesBody TitleImportResultDto  job_titles.import (admin mode): `dryRun` previews; at most 1000 rows
 *   GET    /development-stage-rules                 DevelopmentStageRuleDto[] job_titles.view (read only)
 */
import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { DevelopmentStageRuleDto, JobTitleCardDto, JobTitleContentDto, JobTitlesPageDto, TitleImportResultDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequireAdminMode, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { JOB_TITLES_IMPORT, JOB_TITLES_VIEW, ORG_TITLES_EDIT_CONTENT } from '../../application/policies/org-access.policy';
import { JobTitlesService } from '../../application/services/job-titles.service';
import { ImportTitlesBody, JobTitlesQueryDto, TitleCardQueryDto, UpdateTitleContentBody } from '../dtos/org.dtos';

@ApiTags('org')
@Controller('org')
@HiddenWithPage('job-titles')
export class JobTitlesController {
  constructor(private readonly titles: JobTitlesService) {}

  @Get('job-titles')
  @RequirePermission(JOB_TITLES_VIEW)
  list(@Access() ctx: AccessContext, @Query() query: JobTitlesQueryDto): Promise<JobTitlesPageDto> {
    return this.titles.list(ctx, query);
  }

  @Post('job-titles/bulk')
  @HttpCode(200)
  @RequireAdminMode()
  @RequirePermission(JOB_TITLES_IMPORT)
  importTitles(@Access() ctx: AccessContext, @Body() body: ImportTitlesBody, @CurrentUser() user: SessionUser): Promise<TitleImportResultDto> {
    return this.titles.importTitles(ctx, body, user.id);
  }

  @Get('job-titles/:id/card')
  @RequirePermission(JOB_TITLES_VIEW)
  card(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Query() query: TitleCardQueryDto): Promise<JobTitleCardDto> {
    return this.titles.card(ctx, id, query);
  }

  @Put('job-titles/:id/content')
  @RequireAdminMode()
  @RequirePermission(ORG_TITLES_EDIT_CONTENT)
  updateContent(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateTitleContentBody, @CurrentUser() user: SessionUser): Promise<JobTitleContentDto> {
    return this.titles.updateContent(ctx, id, body, user.id);
  }

  @Get('development-stage-rules')
  @RequirePermission(JOB_TITLES_VIEW)
  stageRules(): Promise<DevelopmentStageRuleDto[]> {
    return this.titles.stageRules();
  }
}
