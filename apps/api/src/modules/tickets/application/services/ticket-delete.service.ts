import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ForbiddenError } from '../../../../common/domain/domain-error';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import { TicketRevisionConflictError } from '../../domain/errors/ticket.errors';
import type { TicketRow, TicketViewer } from '../../domain/types/ticket.types';
import { TICKET_AUDIT } from '../messages/ticket.messages';
import { TicketAccessPolicy } from '../policies/ticket-access.policy';

/**
 * «Delete a ticket» (FR-158): the ticket is hidden from everyone (`deleted_at`), its replies and files stay in the database. Who may: the person whose
 * `tickets.delete` scope reaches the ticket's department. A ticket the person cannot see is 404 (as everywhere), one they see but may not delete is 403.
 */
@Injectable()
export class TicketDeleteService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly policy: TicketAccessPolicy,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  async delete(viewer: TicketViewer, id: string): Promise<void> {
    const row = await this.tickets.find(id);
    this.policy.assertCanView(viewer, row);
    const ticket = row as TicketRow;
    if (!this.policy.mayDelete(viewer, ticket)) throw new ForbiddenError();
    await this.tx.run(async (tx) => {
      if (!(await this.tickets.patch(id, ticket.revision, { deletedAt: this.clock.now() }, tx))) throw new TicketRevisionConflictError();
    });
    const event: AuditEvent = { actorId: viewer.userId, action: TICKET_AUDIT.deleted, entityType: 'ticket', entityId: id, changes: { number: ticket.number, title: ticket.title, status: ticket.status } };
    this.events.emit(AUDIT_EVENT, event);
  }
}
