/**
 * The career-path content of a job title (FR-111, FR-113). Every route is under `/api/career/titles/:id`.
 *
 *   GET    /content     CareerTitleContentDto   career_content.view
 *   PUT    /content     SaveCareerContentDto    career_content.edit: the whole document; `expectedVersion` stale = 409 CAREER_CONTENT_STALE
 *   POST   /file        TitleFileResultDto      career_titlefile.upload: `dryRun` (the default) only reports; a real run saves a new version, 422 TITLE_FILE_NEEDS_REVIEW with `details.problems`
 *   POST   /reopen-acknowledgement ReopenAcknowledgementResultDto career_acknowledge.reopen: the holders are asked to acknowledge again (422 CAREER_PATH_NOT_READY unless the path is ready)
 *   POST   /publish     CareerTitleContentDto   career_titlefile.publish: 422 CAREER_CONTENT_NOT_READY with `details.problems`
 *   POST   /draft       CareerTitleContentDto   career_titlefile.publish
 */
import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type CareerTitleContentDto, type ReopenAcknowledgementResultDto, type TitleFileResultDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import { RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { CareerContentService } from '../../application/services/career-content.service';
import { CareerReopenService } from '../../application/services/career-reopen.service';
import { TitleFileService } from '../../application/services/title-file.service';
import { ExtractTitleFileDto, ReopenAcknowledgementDto, SaveCareerContentDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career/titles/:id')
export class CareerContentController {
  constructor(
    private readonly content: CareerContentService,
    private readonly files: TitleFileService,
    private readonly reopening: CareerReopenService,
  ) {}

  @Get('content')
  @RequirePermission(CorePermission.CareerContentView)
  get(@Param() { id }: IdParam): Promise<CareerTitleContentDto> {
    return this.content.get(id);
  }

  @Put('content')
  @RequirePermission(CorePermission.CareerContentEdit)
  save(@Param() { id }: IdParam, @Body() body: SaveCareerContentDto, @CurrentUser() user: SessionUser): Promise<CareerTitleContentDto> {
    return this.content.save(id, body, user.id);
  }

  @Post('file')
  @HttpCode(200)
  @RequirePermission(CorePermission.CareerTitlefileUpload)
  readFile(@Param() { id }: IdParam, @Body() body: ExtractTitleFileDto, @CurrentUser() user: SessionUser): Promise<TitleFileResultDto> {
    return this.files.extract(id, body, user.id);
  }

  @Post('reopen-acknowledgement')
  @HttpCode(200)
  @RequirePermission(CorePermission.CareerAcknowledgeReopen)
  reopen(@Param() { id }: IdParam, @Body() body: ReopenAcknowledgementDto, @CurrentUser() user: SessionUser): Promise<ReopenAcknowledgementResultDto> {
    return this.reopening.reopen(id, body, user.id);
  }

  @Post('publish')
  @HttpCode(200)
  @RequirePermission(CorePermission.CareerTitlefilePublish)
  publish(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<CareerTitleContentDto> {
    return this.content.publish(id, user.id);
  }

  @Post('draft')
  @HttpCode(200)
  @RequirePermission(CorePermission.CareerTitlefilePublish)
  draft(@Param() { id }: IdParam, @CurrentUser() user: SessionUser): Promise<CareerTitleContentDto> {
    return this.content.draft(id, user.id);
  }
}
