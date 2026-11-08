/**
 * The career-path content of a job title (FR-111, FR-113). Every route is under `/api/career/titles/:id`.
 *
 *   GET    /content     CareerTitleContentDto   career_content.view
 *   PUT    /content     SaveCareerContentDto    career_content.edit: the whole document; `expectedVersion` stale = 409 CAREER_CONTENT_STALE
 *   POST   /publish     CareerTitleContentDto   career_titlefile.publish: 422 CAREER_CONTENT_NOT_READY with `details.problems`
 *   POST   /draft       CareerTitleContentDto   career_titlefile.publish
 */
import { Body, Controller, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type CareerTitleContentDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import { RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { CareerContentService } from '../../application/services/career-content.service';
import { SaveCareerContentDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career/titles/:id')
export class CareerContentController {
  constructor(private readonly content: CareerContentService) {}

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
