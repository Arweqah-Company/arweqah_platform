import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { TicketCatalogDto, TicketDto, TicketFilterOptionsDto, TicketsPageDto } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { viewerOf } from '../../application/policies/ticket-viewer';
import { TicketCatalogService } from '../../application/services/ticket-catalog.service';
import { TicketLifecycleService, type PersonAction } from '../../application/services/ticket-lifecycle.service';
import { TicketsService } from '../../application/services/tickets.service';
import { sendOpenedFile } from '../../../../core/files/presentation/send-file';
import { AttachmentParam, CreateTicketBody, TicketActionBody, TicketReplyBody, TicketsQueryDto } from '../dtos/tickets.dtos';

/**
 * Every action has its own key (the Employee role holds them); on top of that, what else a person sees or does with a ticket
 * follows their relation to it (sender, assignee, desk manager) inside the service, and anybody else gets "not found".
 */
@ApiTags('tickets')
@Controller('tickets')
@HiddenWithPage('tickets')
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly lifecycle: TicketLifecycleService,
    private readonly catalog: TicketCatalogService,
  ) {}

  @Get()
  @RequirePermission(CorePermission.TicketsView)
  list(@Access() ctx: AccessContext, @Query() query: TicketsQueryDto): Promise<TicketsPageDto> {
    return this.tickets.list(viewerOf(ctx), query);
  }

  @Get('options')
  @RequirePermission(CorePermission.TicketsView)
  options(@Access() ctx: AccessContext): Promise<TicketFilterOptionsDto> {
    return this.tickets.options(viewerOf(ctx));
  }

  @Get('catalog')
  @RequirePermission(CorePermission.TicketsCreate)
  catalogOf(): Promise<TicketCatalogDto> {
    return this.catalog.catalog();
  }

  @Post()
  @RequirePermission(CorePermission.TicketsCreate)
  create(@Access() ctx: AccessContext, @Body() body: CreateTicketBody): Promise<TicketDto> {
    return this.tickets.create(viewerOf(ctx), body);
  }

  @Get(':id')
  @RequirePermission(CorePermission.TicketsView)
  get(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<TicketDto> {
    return this.tickets.get(viewerOf(ctx), id);
  }

  @Post(':id/replies')
  @RequirePermission(CorePermission.TicketsReply)
  reply(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TicketReplyBody): Promise<TicketDto> {
    return this.tickets.reply(viewerOf(ctx), id, body);
  }

  @Post(':id/request-close')
  @HttpCode(200)
  @RequirePermission(CorePermission.TicketsRequestClose)
  requestClose(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(ctx, id, 'request_close', body);
  }

  @Post(':id/confirm-close')
  @HttpCode(200)
  @RequirePermission(CorePermission.TicketsConfirmClose)
  confirmClose(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(ctx, id, 'confirm_close', body);
  }

  @Post(':id/decline-close')
  @HttpCode(200)
  @RequirePermission(CorePermission.TicketsDeclineClose)
  declineClose(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(ctx, id, 'decline_close', body);
  }

  @Post(':id/close-without-execution')
  @HttpCode(200)
  @RequirePermission(CorePermission.TicketsCloseWithoutExecution)
  closeWithoutExecution(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(ctx, id, 'close_without_execution', body);
  }

  @Post(':id/reopen')
  @HttpCode(200)
  @RequirePermission(CorePermission.TicketsReopen)
  reopen(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(ctx, id, 'reopen', body);
  }

  @Get(':id/attachments/:fileId')
  @RequirePermission(CorePermission.TicketsView)
  async attachment(@Access() ctx: AccessContext, @Param() { id, fileId }: AttachmentParam, @Res() res: Response): Promise<void> {
    const { file, opened } = await this.tickets.openAttachment(viewerOf(ctx), id, fileId);
    sendOpenedFile(res, file, opened);
  }

  private async act(ctx: AccessContext, id: string, action: PersonAction, body: TicketActionBody): Promise<TicketDto> {
    await this.lifecycle.act(viewerOf(ctx), id, action, body.message);
    return this.tickets.get(viewerOf(ctx), id);
  }
}
