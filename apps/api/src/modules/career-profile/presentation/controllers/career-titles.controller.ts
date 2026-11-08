/**
 * The titles with the state of their career path (FR-113), for the page «career-path content». Under `/api/career`.
 *
 *   POST   /learning-links   LearningImportResultDto   career_content.import: the learning-links sheet (`dryRun` by default; at most 1000 rows)
 *   GET    /titles?search&status&grade&track&orgNodeId&page&pageSize   Paginated<CareerTitleListItemDto>   career_content.view
 */
import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CorePermission, type CareerTitleListItemDto, type LearningImportResultDto, type Paginated } from '@arweqah-platform/shared';
import { RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { LearningLinksService } from '../../application/services/learning-links.service';
import { CareerTitleListService } from '../../application/services/career-title-list.service';
import { CareerTitlesQueryDto, ImportLearningLinksDto } from '../dtos/career-profile.dtos';

@ApiTags('career-profile')
@Controller('career')
export class CareerTitlesController {
  constructor(
    private readonly titles: CareerTitleListService,
    private readonly links: LearningLinksService,
  ) {}

  @Get('titles')
  @RequirePermission(CorePermission.CareerContentView)
  list(@Query() query: CareerTitlesQueryDto): Promise<Paginated<CareerTitleListItemDto>> {
    return this.titles.page(query);
  }

  @Post('learning-links')
  @HttpCode(200)
  @RequirePermission(CorePermission.CareerContentImport)
  importLinks(@Body() body: ImportLearningLinksDto, @CurrentUser() user: SessionUser): Promise<LearningImportResultDto> {
    return this.links.import(body, user.id);
  }
}
