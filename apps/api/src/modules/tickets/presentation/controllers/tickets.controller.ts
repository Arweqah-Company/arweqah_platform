import { Body, Controller, Get, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { TicketCatalogDto, TicketDto, TicketFilterOptionsDto, TicketsPageDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { SessionUser } from '../../../../common/presentation/request-context';
import { IdParam } from '../../../../common/presentation/zod-query';
import { HiddenWithPage } from '../../../../core/access/presentation/require-permission.decorator';
import { TicketCatalogService } from '../../application/services/ticket-catalog.service';
import { TicketLifecycleService, type PersonAction } from '../../application/services/ticket-lifecycle.service';
import { TicketsService } from '../../application/services/tickets.service';
import { AttachmentParam, CreateTicketBody, TicketActionBody, TicketReplyBody, TicketsQueryDto } from '../dtos/tickets.dtos';

/**
 * security: self-scoped. Every employee may send tickets and follow their own; what else a person sees or does with a ticket
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
  list(@CurrentUser() user: SessionUser, @Query() query: TicketsQueryDto): Promise<TicketsPageDto> {
    return this.tickets.list(user.id, query);
  }

  @Get('options')
  options(@CurrentUser() user: SessionUser): Promise<TicketFilterOptionsDto> {
    return this.tickets.options(user.id);
  }

  @Get('catalog')
  catalogOf(): Promise<TicketCatalogDto> {
    return this.catalog.catalog();
  }

  @Post()
  create(@CurrentUser() user: SessionUser, @Body() body: CreateTicketBody): Promise<TicketDto> {
    return this.tickets.create(user.id, body);
  }

  @Get(':id')
  get(@CurrentUser() user: SessionUser, @Param() { id }: IdParam): Promise<TicketDto> {
    return this.tickets.get(user.id, id);
  }

  @Post(':id/replies')
  reply(@CurrentUser() user: SessionUser, @Param() { id }: IdParam, @Body() body: TicketReplyBody): Promise<TicketDto> {
    return this.tickets.reply(user.id, id, body);
  }

  @Post(':id/request-close')
  @HttpCode(200)
  requestClose(@CurrentUser() user: SessionUser, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(user, id, 'request_close', body);
  }

  @Post(':id/confirm-close')
  @HttpCode(200)
  confirmClose(@CurrentUser() user: SessionUser, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(user, id, 'confirm_close', body);
  }

  @Post(':id/decline-close')
  @HttpCode(200)
  declineClose(@CurrentUser() user: SessionUser, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(user, id, 'decline_close', body);
  }

  @Post(':id/close-without-execution')
  @HttpCode(200)
  closeWithoutExecution(@CurrentUser() user: SessionUser, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(user, id, 'close_without_execution', body);
  }

  @Post(':id/reopen')
  @HttpCode(200)
  reopen(@CurrentUser() user: SessionUser, @Param() { id }: IdParam, @Body() body: TicketActionBody): Promise<TicketDto> {
    return this.act(user, id, 'reopen', body);
  }

  @Get(':id/attachments/:fileId')
  async attachment(@CurrentUser() user: SessionUser, @Param() { id, fileId }: AttachmentParam, @Res() res: Response): Promise<void> {
    const { file, opened } = await this.tickets.openAttachment(user.id, id, fileId);
    if ('url' in opened) return res.redirect(opened.url);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    opened.stream.pipe(res);
  }

  private async act(user: SessionUser, id: string, action: PersonAction, body: TicketActionBody): Promise<TicketDto> {
    await this.lifecycle.act(user.id, id, action, body.message);
    return this.tickets.get(user.id, id);
  }
}
