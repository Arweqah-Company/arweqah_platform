import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import { ChooseHandlerError, TicketRevisionConflictError } from '../../domain/errors/ticket.errors';
import type { TicketRow, TicketViewer } from '../../domain/types/ticket.types';
import { TICKET_AUDIT } from '../messages/ticket.messages';
import { TicketAccessPolicy } from '../policies/ticket-access.policy';
import { TicketNotifier } from './ticket-notifier.service';

/**
 * A ticket of a type with several handlers waits for someone to take it. The head of the unit (the choose key, reaching the ticket's department) picks one
 * of those handlers: the ticket becomes theirs and leaves the other handlers' inboxes.
 */
@Injectable()
export class TicketHandlerChoiceService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly policy: TicketAccessPolicy,
    private readonly notifier: TicketNotifier,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async choose(viewer: TicketViewer, id: string, handlerUserId: string): Promise<void> {
    const row = await this.tickets.find(id);
    this.policy.assertCanView(viewer, row);
    const ticket = row as TicketRow;
    if (!this.policy.mayChooseHandler(viewer, ticket) || !ticket.typeHandlerUserIds.includes(handlerUserId)) throw new ChooseHandlerError();
    await this.tx.run(async (tx) => {
      const changed = await this.tickets.patch(ticket.id, ticket.revision, { assigneeUserId: handlerUserId, lastActivityAt: this.clock.now() }, tx);
      if (!changed) throw new TicketRevisionConflictError();
      await this.tickets.appendEvent({ ticketId: ticket.id, type: 'reassigned', actorUserId: viewer.userId, body: null, fileIds: [], replyToUserId: handlerUserId }, tx);
      await this.notifier.send({ kind: 'reassigned', ticket, recipients: [handlerUserId], email: true, actorUserId: viewer.userId, tx });
    });
    const event: AuditEvent = { actorId: viewer.userId, action: TICKET_AUDIT.reassigned, entityType: 'ticket', entityId: ticket.id, changes: { from: null, to: handlerUserId, chosenAmong: ticket.typeHandlerUserIds.length } };
    this.events.emit(AUDIT_EVENT, event);
  }
}
