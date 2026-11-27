import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { EditTicketReplyInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import { TicketCommentNotAllowedError, TicketReplyEditExpiredError, TicketReplyNotFoundError, TicketStateInvalidError } from '../../domain/errors/ticket.errors';
import { abilitiesFor, reopenDaysLeft } from '../../domain/rules/ticket-lifecycle.rules';
import { TICKET_REPLY_EDIT_MINUTES, withinReplyEditWindow } from '../../domain/rules/ticket-reply.rules';
import type { TicketRow, TicketViewer } from '../../domain/types/ticket.types';
import { TICKET_AUDIT } from '../messages/ticket.messages';
import { TicketAccessPolicy } from '../policies/ticket-access.policy';
import { TicketReplyPolicy } from '../policies/ticket-reply.policy';
import { TicketReplyNotices } from './ticket-reply-notices.service';

/** An author changes the text of their own reply, for a few minutes after sending it (FR-205). The files, the answer link and the history stay as they were. */
@Injectable()
export class TicketReplyEditService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly access: TicketAccessPolicy,
    private readonly replyPolicy: TicketReplyPolicy,
    private readonly notices: TicketReplyNotices,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async edit(viewer: TicketViewer, ticketId: string, eventId: string, input: EditTicketReplyInput): Promise<void> {
    const row = await this.tickets.find(ticketId);
    const relations = this.access.assertCanView(viewer, row);
    const ticket = row as TicketRow;
    const now = this.clock.now();
    const reply = await this.tickets.reply(ticketId, eventId);
    if (!reply) throw new TicketReplyNotFoundError();
    if (reply.actorUserId !== viewer.userId) throw new TicketCommentNotAllowedError('edit another person’s reply');
    if (!abilitiesFor(relations, ticket.status, reopenDaysLeft(ticket.status, ticket.closedAt, ticket.deskReopenWindowDays, now)).reply) throw new TicketStateInvalidError('edit_reply', ticket.status);
    if (!withinReplyEditWindow(reply.createdAt, now)) throw new TicketReplyEditExpiredError(TICKET_REPLY_EDIT_MINUTES);
    const previous = (await this.tickets.mentions([eventId])).map((m) => m.userId);
    const mentionIds = await this.replyPolicy.mentions(viewer, ticket, input.body, previous);
    await this.tx.run(async (tx) => {
      await this.tickets.editReply(eventId, { body: input.body, editedAt: now, mentionIds }, tx);
      await this.notices.sendMentions({ ticket, actorUserId: viewer.userId, userIds: mentionIds.filter((id) => !previous.includes(id)), tx });
    });
    const event: AuditEvent = { actorId: viewer.userId, action: TICKET_AUDIT.replyEdited, entityType: 'ticket', entityId: ticketId, changes: { eventId, mentions: mentionIds.length } };
    this.events.emit(AUDIT_EVENT, event);
  }
}
