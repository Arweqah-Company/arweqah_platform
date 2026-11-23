import { Controller, Get, HttpCode, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CorePermission, type NoticeChannelRefDto, type NoticeHomeDto, type NoticeMineDetailsDto, type NoticeMinePageDto } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AuthenticatedRequest } from '../../../../common/presentation/request-context';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AgentHidden } from '../../../../core/agent/presentation/agent-hidden.decorator';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { FilesService } from '../../../../core/files/application/files.service';
import { sendOpenedFile, sendPreviewStream } from '../../../../core/files/presentation/send-file';
import { NoticeAckImpersonationError } from '../../domain/errors/notice.errors';
import { NoticeMineService } from '../../application/services/notice-mine.service';
import { NoticeAttachmentParam, NoticeMineQueryDto } from '../dtos/notices.dtos';

/**
 * What reached the person, whoever they are: every employee reads their notices and acknowledges their policies. Only notices that reached the person exist for them
 * (anything else is «not found»). An acknowledgement is the employee's own word, so a «sign in as» session cannot give it.
 */
@ApiTags('notices')
@Controller('notices')
@HiddenWithPage('notices')
export class NoticeMineController {
  constructor(
    private readonly mine: NoticeMineService,
    private readonly files: FilesService,
  ) {}

  @Get('home')
  @RequirePermission(CorePermission.NoticesView)
  home(@Access() ctx: AccessContext): Promise<NoticeHomeDto> {
    return this.mine.home(ctx);
  }

  @Get('mine')
  @RequirePermission(CorePermission.NoticesView)
  list(@Access() ctx: AccessContext, @Query() query: NoticeMineQueryDto): Promise<NoticeMinePageDto> {
    return this.mine.list(ctx.userId, query);
  }

  @Get('mine/channels')
  @RequirePermission(CorePermission.NoticesView)
  channels(@Access() ctx: AccessContext): Promise<NoticeChannelRefDto[]> {
    return this.mine.mineChannels(ctx.userId);
  }

  @Get('mine/:id')
  @RequirePermission(CorePermission.NoticesView)
  details(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<NoticeMineDetailsDto> {
    return this.mine.details(ctx.userId, id);
  }

  @Post('mine/:id/read')
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesView)
  read(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<NoticeMineDetailsDto> {
    return this.mine.read(ctx.userId, id);
  }

  /** The assistant never acknowledges for an employee: the acknowledgement is the employee's own word. */
  @Post('mine/:id/acknowledge')
  @AgentHidden()
  @HttpCode(200)
  @RequirePermission(CorePermission.NoticesAcknowledge)
  acknowledge(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Req() req: Request): Promise<NoticeMineDetailsDto> {
    if ((req as AuthenticatedRequest).session?.session.impersonatedByUserId) throw new NoticeAckImpersonationError();
    return this.mine.acknowledge(ctx.userId, id);
  }

  @Get('mine/:id/attachments/:fileId')
  @RequirePermission(CorePermission.NoticesView)
  async attachment(@Access() ctx: AccessContext, @Param() { id, fileId }: NoticeAttachmentParam, @Res() res: Response): Promise<void> {
    const file = await this.files.getGranted(await this.mine.attachment(ctx.userId, id, fileId));
    sendOpenedFile(res, file, await this.files.open(file));
  }

  @Get('mine/:id/attachments/:fileId/preview')
  @RequirePermission(CorePermission.NoticesView)
  async preview(@Access() ctx: AccessContext, @Param() { id, fileId }: NoticeAttachmentParam, @Res() res: Response): Promise<void> {
    const file = await this.files.getGranted(await this.mine.attachment(ctx.userId, id, fileId));
    sendPreviewStream(res, file, await this.files.preview(file));
  }
}
