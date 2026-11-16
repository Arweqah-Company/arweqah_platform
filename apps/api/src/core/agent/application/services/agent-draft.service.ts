import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AgentMessageDto, AgentReplyDto } from '@arweqah-platform/shared';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../audit/application/audit.events';
import { AgentRepository } from '../../domain/contracts/agent.repository';
import type { AgentMessage } from '../../domain/entities/agent.entities';
import { AgentDraftExpiredError, AgentDraftNotFoundError, AgentDraftNotPendingError } from '../../domain/errors/agent.errors';
import { AGENT_AUDIT, outcomeText } from '../messages/agent.messages';
import { toMessageDto } from '../transformers/agent.transformer';
import { AgentAvailability } from './agent-availability';
import { AgentCatalogService } from './agent-catalog.service';
import { AgentExecutor, failureOf, type AgentRequestContext } from './agent-executor';

/**
 * Confirming or cancelling a draft (FR-141). A draft runs once (an atomic claim), only while it has not expired, only for its owner, and only if the person still
 * holds the key of the action: the route is found again in the catalog by its id (a stored path is never trusted) and then runs with the person's own session.
 */
@Injectable()
export class AgentDraftService {
  constructor(
    private readonly repo: AgentRepository,
    private readonly catalog: AgentCatalogService,
    private readonly executor: AgentExecutor,
    private readonly events: EventEmitter2,
    private readonly availability: AgentAvailability,
  ) {}

  async confirm(ctx: AccessContext, userId: string, draftId: string, request: AgentRequestContext): Promise<AgentReplyDto> {
    await this.availability.assertOn();
    const message = await this.pendingDraft(userId, draftId);
    const draft = message.draft!;
    const action = this.catalog.find(draft.operationId);
    if (!action || !ctx.has(action.permission)) {
      await this.repo.finishDraft(message.id, 'failed', { ok: false, status: 403, message: 'No permission' });
      throw new ForbiddenError();
    }
    if (!(await this.repo.claimDraft(message.id, new Date()))) throw new AgentDraftNotPendingError();
    const result = await this.executor.run(action, draft.input, request);
    const detail = result.ok ? '' : failureOf(result);
    await this.repo.finishDraft(message.id, result.ok ? 'confirmed' : 'failed', { ok: result.ok, status: result.status, message: detail });
    this.audit(userId, result.ok, message, result.status);
    const outcome = await this.repo.addMessage({ conversationId: message.conversationId, role: 'assistant', text: outcomeText(draft, result.ok, detail, request.locale) });
    await this.repo.touchConversation(message.conversationId);
    return { conversationId: message.conversationId, messages: [await this.reload(userId, message.id), toMessageDto(outcome)] };
  }

  async cancel(userId: string, draftId: string): Promise<AgentMessageDto> {
    await this.availability.assertOn();
    const message = await this.pendingDraft(userId, draftId);
    await this.repo.setDraftStatus(message.id, 'cancelled');
    return this.reload(userId, message.id);
  }

  /** The draft only for its owner, still waiting and not expired (an expired one is marked so). */
  private async pendingDraft(userId: string, draftId: string): Promise<AgentMessage> {
    const message = await this.repo.findDraftMessage(draftId, userId);
    if (!message?.draft) throw new AgentDraftNotFoundError();
    if (message.draftStatus !== 'pending') throw new AgentDraftNotPendingError();
    if (!message.draftExpiresAt || message.draftExpiresAt.getTime() <= Date.now()) {
      await this.repo.setDraftStatus(message.id, 'expired');
      throw new AgentDraftExpiredError();
    }
    return message;
  }

  private async reload(userId: string, id: string): Promise<AgentMessageDto> {
    return toMessageDto((await this.repo.findDraftMessage(id, userId))!);
  }

  private audit(userId: string, ok: boolean, message: AgentMessage, status: number): void {
    const event: AuditEvent = {
      actorId: userId,
      action: ok ? AGENT_AUDIT.executed : AGENT_AUDIT.failed,
      entityType: 'agent_message',
      entityId: message.id,
      changes: { via: 'agent', operationId: message.draft!.operationId, status },
    };
    this.events.emit(AUDIT_EVENT, event);
  }
}
