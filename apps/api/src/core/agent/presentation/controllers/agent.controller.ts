import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CorePermission, type AgentConversationDetailDto, type AgentConversationDto, type AgentMessageDto, type AgentReplyDto } from '@arweqah-platform/shared';
import { CurrentUser } from '../../../../common/presentation/current-user.decorator';
import type { AuthenticatedRequest, SessionUser } from '../../../../common/presentation/request-context';
import type { AccessContext } from '../../../access/domain/access-context';
import { Access, RequirePermission, type RequestWithAccess } from '../../../access/presentation/require-permission.decorator';
import { AgentChatService } from '../../application/services/agent-chat.service';
import { AgentConversationsService } from '../../application/services/agent-conversations.service';
import { AgentFormService } from '../../application/services/agent-form.service';
import { AgentDraftService } from '../../application/services/agent-draft.service';
import type { AgentRequestContext } from '../../application/services/agent-executor';
import { localeOf } from '../../application/messages/agent.messages';
import { AgentHidden } from '../agent-hidden.decorator';
import { errorEvent, openEventStream, writeEvent } from '../event-stream';
import { AgentFormSubmitBody, AgentIdParam, AgentMessageBody } from '../dtos/agent.dtos';

/** The request the guard has already given a session and the person's access to. */
type StreamRequest = Request & AuthenticatedRequest & RequestWithAccess;

/** What the executor needs from the request: the person's own session, their address, the port this API listens on, their language (the platform's own language the web sends, else the browser's). */
function requestContextOf(request: Request): AgentRequestContext {
  return { cookie: request.headers.cookie ?? '', ip: request.ip ?? null, port: request.socket.localPort ?? 3000, locale: localeOf(request.headers['x-ui-language'] ?? request.headers['accept-language']) };
}

/** The platform assistant. It is not in its own catalog: the assistant cannot call itself. */
@ApiTags('agent')
@Controller('agent')
@AgentHidden()
export class AgentController {
  constructor(
    private readonly chat: AgentChatService,
    private readonly drafts: AgentDraftService,
    private readonly conversations: AgentConversationsService,
    private readonly forms: AgentFormService,
  ) {}

  @Post('messages')
  @RequirePermission(CorePermission.AgentUse)
  send(@Access() ctx: AccessContext, @CurrentUser() user: SessionUser, @Body() body: AgentMessageBody, @Req() request: Request): Promise<AgentReplyDto> {
    return this.chat.send({ ctx, userId: user.id, input: body, request: requestContextOf(request) });
  }

  /** The same as `messages`, answered as a stream of events (status, text, reply, error) so the panel shows what is happening and the answer as it is written (FR-149). */
  @Post('messages/stream')
  @RequirePermission(CorePermission.AgentUse)
  async stream(@Body() body: AgentMessageBody, @Req() request: StreamRequest, @Res() response: Response): Promise<void> {
    openEventStream(response);
    try {
      const reply = await this.chat.send({
        ctx: request.access!,
        userId: request.user!.id,
        input: body,
        request: requestContextOf(request),
        events: { status: (status) => writeEvent(response, 'status', status), text: (delta) => writeEvent(response, 'text', { delta }) },
      });
      writeEvent(response, 'reply', reply);
    } catch (error) {
      writeEvent(response, 'error', errorEvent(error));
    } finally {
      response.end();
    }
  }

  @Get('conversations')
  @RequirePermission(CorePermission.AgentHistoryView)
  list(@CurrentUser() user: SessionUser): Promise<AgentConversationDto[]> {
    return this.conversations.list(user.id);
  }

  @Get('conversations/:id')
  @RequirePermission(CorePermission.AgentView)
  detail(@CurrentUser() user: SessionUser, @Param() { id }: AgentIdParam): Promise<AgentConversationDetailDto> {
    return this.conversations.detail(user.id, id);
  }

  /** Sends the form the assistant offered: the same checks as a proposal, then the same confirmation card (nothing runs yet). */
  @Post('forms/:id/submit')
  @RequirePermission(CorePermission.AgentUse)
  submitForm(@Param() { id }: AgentIdParam, @Body() body: AgentFormSubmitBody, @Req() request: StreamRequest): Promise<AgentReplyDto> {
    return this.forms.submit({ ctx: request.access!, userId: request.user!.id, id, input: body, locale: requestContextOf(request).locale });
  }

  @Post('drafts/:id/confirm')
  @RequirePermission(CorePermission.AgentUse)
  confirm(@Access() ctx: AccessContext, @CurrentUser() user: SessionUser, @Param() { id }: AgentIdParam, @Req() request: Request): Promise<AgentReplyDto> {
    return this.drafts.confirm(ctx, user.id, id, requestContextOf(request));
  }

  @Post('drafts/:id/cancel')
  @RequirePermission(CorePermission.AgentUse)
  cancel(@CurrentUser() user: SessionUser, @Param() { id }: AgentIdParam): Promise<AgentMessageDto> {
    return this.drafts.cancel(user.id, id);
  }
}
