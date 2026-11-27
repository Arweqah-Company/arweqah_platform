import { CorePermission } from '@arweqah-platform/shared';
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { PersonRefDto, TicketCatalogDto, TicketDto, TicketFilterOptionsDto, TicketsPageDto } from '@arweqah-platform/shared';
import { IdParam } from '../../../../common/presentation/zod-query';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { Access, HiddenWithPage, RequirePermission } from '../../../../core/access/presentation/require-permission.decorator';
import { viewerOf } from '../../application/policies/ticket-viewer';
import { TicketCatalogService } from '../../application/services/ticket-catalog.service';
import { TicketLifecycleService, type PersonAction } from '../../application/services/ticket-lifecycle.service';
import { TicketDeleteService } from '../../application/services/ticket-delete.service';
import { TicketReassignService } from '../../application/services/ticket-reassign.service';
import { TicketHandlerChoiceService } from '../../application/services/ticket-handler-choice.service';
import { TicketReactionsService } from '../../application/services/ticket-reactions.service';
import { TicketReplyEditService } from '../../application/services/ticket-reply-edit.service';
import { TicketsService } from '../../application/services/tickets.service';
import { sendOpenedFile, sendPreviewStream } from '../../../../core/files/presentation/send-file';
import { AttachmentParam, ChooseHandlerBody, CreateTicketBody, EditTicketReplyBody, EventParam, ReactionBody, ReassignTicketBody, TicketActionBody, MentionablesQueryDto, TicketReplyBody, TicketsQueryDto } from '../dtos/tickets.dtos';

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
    private readonly reassigner: TicketReassignService,
    private readonly chooser: TicketHandlerChoiceService,
    private readonly remover: TicketDeleteService,
    private readonly replyEditor: TicketReplyEditService,
    private readonly reactions: TicketReactionsService,
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

  @Get(':id/mentionables')
  @RequirePermission(CorePermission.TicketsCommentMention)
  mentionables(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Query() { search }: MentionablesQueryDto): Promise<PersonRefDto[]> {
    return this.tickets.mentionables(viewerOf(ctx), id, search);
  }

  @Post(':id/replies')
  @RequirePermission(CorePermission.TicketsReply)
  reply(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: TicketReplyBody): Promise<TicketDto> {
    return this.tickets.reply(viewerOf(ctx), id, body);
  }

  /** Changes the text of one's own reply (the service checks the author and the 15 minutes). */
  @Patch(':id/events/:eventId')
  @RequirePermission(CorePermission.TicketsReplyEdit)
  async editReply(@Access() ctx: AccessContext, @Param() { id, eventId }: EventParam, @Body() body: EditTicketReplyBody): Promise<TicketDto> {
    await this.replyEditor.edit(viewerOf(ctx), id, eventId, body);
    return this.tickets.get(viewerOf(ctx), id);
  }

  @Put(':id/events/:eventId/reaction')
  @RequirePermission(CorePermission.TicketsReplyReact)
  async react(@Access() ctx: AccessContext, @Param() { id, eventId }: EventParam, @Body() body: ReactionBody): Promise<TicketDto> {
    await this.reactions.react(viewerOf(ctx), id, eventId, body);
    return this.tickets.get(viewerOf(ctx), id);
  }

  @Delete(':id/events/:eventId/reaction')
  @RequirePermission(CorePermission.TicketsReplyReact)
  async unreact(@Access() ctx: AccessContext, @Param() { id, eventId }: EventParam): Promise<TicketDto> {
    await this.reactions.unreact(viewerOf(ctx), id, eventId);
    return this.tickets.get(viewerOf(ctx), id);
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

  @Get(':id/assignees')
  @RequirePermission(CorePermission.TicketsReassign)
  assignees(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Query() { search }: MentionablesQueryDto): Promise<PersonRefDto[]> {
    return this.reassigner.candidates(viewerOf(ctx), id, search);
  }

  @Post(':id/reassign')
  @HttpCode(200)
  @RequirePermission(CorePermission.TicketsReassign)
  async reassign(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: ReassignTicketBody): Promise<TicketDto> {
    await this.reassigner.reassign(viewerOf(ctx), id, body.assigneeUserId);
    return this.tickets.get(viewerOf(ctx), id);
  }

  @Post(':id/handler')
  @HttpCode(200)
  @RequirePermission(CorePermission.TicketsChooseHandler)
  async chooseHandler(@Access() ctx: AccessContext, @Param() { id }: IdParam, @Body() body: ChooseHandlerBody): Promise<TicketDto> {
    await this.chooser.choose(viewerOf(ctx), id, body.handlerUserId);
    return this.tickets.get(viewerOf(ctx), id);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(CorePermission.TicketsDelete)
  async remove(@Access() ctx: AccessContext, @Param() { id }: IdParam): Promise<void> {
    await this.remover.delete(viewerOf(ctx), id);
  }

  @Get(':id/attachments/:fileId')
  @RequirePermission(CorePermission.TicketsView)
  async attachment(@Access() ctx: AccessContext, @Param() { id, fileId }: AttachmentParam, @Res() res: Response): Promise<void> {
    const { file, opened } = await this.tickets.openAttachment(viewerOf(ctx), id, fileId);
    sendOpenedFile(res, file, opened);
  }

  @Get(':id/attachments/:fileId/preview')
  @RequirePermission(CorePermission.TicketsView)
  async previewAttachment(@Access() ctx: AccessContext, @Param() { id, fileId }: AttachmentParam, @Res() res: Response): Promise<void> {
    const { file, stream } = await this.tickets.previewAttachment(viewerOf(ctx), id, fileId);
    sendPreviewStream(res, file, stream);
  }

  private async act(ctx: AccessContext, id: string, action: PersonAction, body: TicketActionBody): Promise<TicketDto> {
    await this.lifecycle.act(viewerOf(ctx), id, action, body.message);
    return this.tickets.get(viewerOf(ctx), id);
  }
}
