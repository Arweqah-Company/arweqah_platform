import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PersonRefDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import { TicketRepository } from '../../domain/contracts/ticket.repository';
import { ReassignTargetError, TicketRevisionConflictError, TicketStateInvalidError } from '../../domain/errors/ticket.errors';
import type { TicketRow, TicketViewer } from '../../domain/types/ticket.types';
import { TICKET_AUDIT } from '../messages/ticket.messages';
import { TicketAccessPolicy } from '../policies/ticket-access.policy';
import { TicketNotifier } from './ticket-notifier.service';

/** The unit hands a ticket to another employee of its own reach: the list of who, and the change itself. */
@Injectable()
export class TicketReassignService {
  constructor(
    private readonly tickets: TicketRepository,
    private readonly directory: TicketDirectory,
    private readonly policy: TicketAccessPolicy,
    private readonly notifier: TicketNotifier,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly events: EventEmitter2,
  ) {}

  /** Who this person may hand the ticket to (never the current assignee). */
  async candidates(viewer: TicketViewer, id: string, search?: string): Promise<PersonRefDto[]> {
    const { ticket, reach } = await this.reachOf(viewer, id);
    const people = await this.directory.reassignCandidates(reach.companyId, reach.nodeIds, { search });
    return people.filter((p) => p.id !== ticket.assigneeUserId).map((p) => ({ id: p.id, name: p.name }));
  }

  async reassign(viewer: TicketViewer, id: string, assigneeUserId: string): Promise<void> {
    const { ticket, reach } = await this.reachOf(viewer, id);
    const [target] = assigneeUserId === ticket.assigneeUserId ? [] : await this.directory.reassignCandidates(reach.companyId, reach.nodeIds, { userId: assigneeUserId });
    if (!target) throw new ReassignTargetError();
    await this.tx.run(async (tx) => {
      const changed = await this.tickets.patch(ticket.id, ticket.revision, { assigneeUserId: target.id, lastActivityAt: this.clock.now() }, tx);
      if (!changed) throw new TicketRevisionConflictError();
      await this.tickets.appendEvent({ ticketId: ticket.id, type: 'reassigned', actorUserId: viewer.userId, body: null, fileIds: [], replyToUserId: target.id }, tx);
      await this.notifier.send({ kind: 'reassigned', ticket, recipients: [target.id], email: true, actorUserId: viewer.userId, tx });
    });
    const event: AuditEvent = { actorId: viewer.userId, action: TICKET_AUDIT.reassigned, entityType: 'ticket', entityId: ticket.id, changes: { from: ticket.assigneeUserId, to: target.id } };
    this.events.emit(AUDIT_EVENT, event);
  }

  /** The ticket for somebody who may see it (404 for anybody else) and the reach of their reassign key over it. */
  private async reachOf(viewer: TicketViewer, id: string): Promise<{ ticket: TicketRow; reach: NonNullable<ReturnType<TicketAccessPolicy['reassignReach']>> }> {
    const row = await this.tickets.find(id);
    this.policy.assertCanView(viewer, row);
    const ticket = row as TicketRow;
    const reach = this.policy.reassignReach(viewer, ticket);
    if (!reach) throw new TicketStateInvalidError('reassign', ticket.status);
    return { ticket, reach };
  }
}
