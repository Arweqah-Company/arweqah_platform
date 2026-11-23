import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  CorePermission,
  type NoticeAcknowledgementsDto,
  type NoticeAudienceCountDto,
  type NoticeAudienceOptionsDto,
  type NoticeAudienceReportDto,
  type NoticeDetailsDto,
  type NoticeFilterOptionsDto,
  type NoticeFlowDto,
  type NoticesPageDto,
} from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { FilesService } from '../../../../core/files/application/files.service';
import { sendOpenedFile, sendPreviewStream } from '../../../../core/files/presentation/send-file';
import { NoticeAccessPolicy } from '../../application/policies/notice-access.policy';
import { NoticeAudienceService } from '../../application/services/notice-audience.service';
import { NoticeLifecycleService } from '../../application/services/notice-lifecycle.service';
import { NoticeQueryService } from '../../application/services/notice-query.service';
import { NoticeReportService } from '../../application/services/notice-report.service';
import { NoticeRevisionService } from '../../application/services/notice-revision.service';
import { NoticeService } from '../../application/services/notice.service';
import { NoticeNotFoundError } from '../../domain/errors/notice.errors';
import { NoticeRepository } from '../../domain/contracts/notice.repository';
import {
  CreateNoticeBody,
  NoticeAcknowledgementsQueryDto,
  NoticeActionBody,
  NoticeAttachmentParam,
  NoticeAudienceCountBody,
  NoticeAudienceOptionsQueryDto,
  NoticeManageQueryDto,
  UpdateNoticeBody,
} from '../dtos/notices.dtos';

/**
 * Writing, managing and reading the reports of notices. Every action has its own key; on top of that a notice outside the reach of the key, or one the person has
 * nothing to do with, is «not found». This controller is registered last because of `:id`.
 */
@ApiTags('notices')
@Controller('notices')
@HiddenWithPage('notices-manage')
export class NoticesController {
  constructor(
    private readonly notices: NoticeService,
    private readonly queries: NoticeQueryService,
    private readonly reports: NoticeReportService,
    private readonly revisions: NoticeRevisionService,
    private readonly lifecycle: NoticeLifecycleService,
    private readonly audience: NoticeAudienceService,
    private readonly policy: NoticeAccessPolicy,
    private readonly repo: NoticeRepository,
    private readonly files: FilesService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.NoticesManageView)
  list(@Access() ctx: AccessContext, @Query() query: NoticeManageQueryDto): Promise<NoticesPageDto> {
    return this.queries.list(ctx, query);
  }

  @Get('options')
  @RequirePermission(CorePermission.NoticesManageView)
  options(@Access() ctx: AccessContext): Promise<NoticeFilterOptionsDto> {
    return this.queries.options(ctx);
  }

  /** The units, job titles and groups of people a writer may aim a notice at (the picker of the form). */
  @Get('audience/options')
  @RequirePermission(CorePermission.NoticesManageView)
  audienceOptions(@Query() { search }: NoticeAudienceOptionsQueryDto): Promise<NoticeAudienceOptionsDto> {
    return this.audience.options(search);
  }

  /** «Reaches N employees» under the audience picker while the writer chooses. */
  @Post('audience/count')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesManageView)
  audienceCount(@Body() body: NoticeAudienceCountBody): Promise<NoticeAudienceCountDto> {
    return this.audience.count(body.audience);
  }

  @Post()
  @RequirePermission(CorePermission.NoticesCreate)
  async create(@Access() ctx: AccessContext, @Body() body: CreateNoticeBody): Promise<NoticeDetailsDto> {
    return this.queries.details(ctx, await this.notices.create(ctx, body));
  }

  @Get(':id')
  @RequirePermission(CorePermission.NoticesManageView)
  details(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<NoticeDetailsDto> {
    return this.queries.details(ctx, id);
  }

  @Put(':id')
  @RequirePermission(CorePermission.NoticesEdit)
  async update(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: UpdateNoticeBody): Promise<NoticeDetailsDto> {
    return this.queries.details(ctx, await this.notices.update(ctx, id, body));
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(CorePermission.NoticesDelete)
  async remove(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<void> {
    await this.notices.remove(ctx, id);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesSubmit)
  async submit(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: NoticeActionBody): Promise<NoticeDetailsDto> {
    return this.queries.details(ctx, await this.notices.submit(ctx, id, body));
  }

  @Post(':id/pin')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesPin)
  async pin(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: NoticeActionBody): Promise<NoticeDetailsDto> {
    await this.lifecycle.pin(ctx, id, body);
    return this.queries.details(ctx, id);
  }

  @Delete(':id/pin')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesPin)
  async unpin(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<NoticeDetailsDto> {
    await this.lifecycle.unpin(ctx, id);
    return this.queries.details(ctx, id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesArchive)
  async archive(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: NoticeActionBody): Promise<NoticeDetailsDto> {
    await this.lifecycle.archive(ctx, id, body);
    return this.queries.details(ctx, id);
  }

  @Post(':id/revise')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesRevise)
  async revise(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: NoticeActionBody): Promise<NoticeDetailsDto> {
    await this.revisions.revise(ctx, id, body);
    return this.queries.details(ctx, id);
  }

  @Post(':id/revise-cancel')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesReviseCancel)
  async reviseCancel(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: NoticeActionBody): Promise<NoticeDetailsDto> {
    await this.revisions.cancel(ctx, id, body);
    return this.queries.details(ctx, id);
  }

  @Get(':id/flow')
  @RequirePermission(CorePermission.NoticesManageView)
  flow(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<NoticeFlowDto> {
    return this.reports.flow(ctx, id);
  }

  @Get(':id/audience')
  @RequirePermission(CorePermission.NoticesManageView)
  audienceOf(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<NoticeAudienceReportDto> {
    return this.reports.audience(ctx, id);
  }

  @Get(':id/acknowledgements')
  @RequirePermission(CorePermission.NoticesAckReport)
  acknowledgements(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Query() query: NoticeAcknowledgementsQueryDto): Promise<NoticeAcknowledgementsDto> {
    return this.reports.acknowledgements(ctx, id, query);
  }

  @Get(':id/attachments/:fileId')
  @RequirePermission(CorePermission.NoticesManageView)
  async attachment(@Access() ctx: AccessContext, @Param() { id, fileId }: NoticeAttachmentParam, @Res() res: Response): Promise<void> {
    const file = await this.fileOf(ctx, id, fileId);
    sendOpenedFile(res, file, await this.files.open(file));
  }

  @Get(':id/attachments/:fileId/preview')
  @RequirePermission(CorePermission.NoticesManageView)
  async preview(@Access() ctx: AccessContext, @Param() { id, fileId }: NoticeAttachmentParam, @Res() res: Response): Promise<void> {
    const file = await this.fileOf(ctx, id, fileId);
    sendPreviewStream(res, file, await this.files.preview(file));
  }

  private async fileOf(ctx: AccessContext, id: string, fileId: string) {
    await this.policy.load(ctx, CorePermission.NoticesManageView, id);
    if (!(await this.repo.hasAttachment(id, fileId))) throw new NoticeNotFoundError();
    return this.files.getGranted(fileId);
  }
}
