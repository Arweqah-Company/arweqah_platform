import { Injectable } from '@nestjs/common';
import type { TicketRelation } from '@arweqah-platform/shared';
import { TicketNotFoundError } from '../../domain/errors/ticket.errors';
import type { TicketRow } from '../../domain/types/ticket.types';

/**
 * Who sees a ticket follows the person's relation to it: the sender, the assignee, and the manager of the desk.
 * A personal ticket is never shown to the manager (nor to a platform manager): only the sender and the assignee.
 * Anybody else gets "not found", never "forbidden", so the ticket's existence is not revealed.
 */
@Injectable()
export class TicketAccessPolicy {
  relationsOf(userId: string, ticket: TicketRow): TicketRelation[] {
    const relations: TicketRelation[] = [];
    if (ticket.senderUserId === userId) relations.push('sender');
    if (ticket.assigneeUserId === userId) relations.push('assignee');
    if (!ticket.isPersonal && ticket.deskManagerUserId === userId) relations.push('manager');
    return relations;
  }

  /** The relations of someone allowed to see the ticket; throws 404 for everybody else. */
  assertCanView(userId: string, ticket: TicketRow | null): TicketRelation[] {
    const relations = ticket ? this.relationsOf(userId, ticket) : [];
    if (!ticket || relations.length === 0) throw new TicketNotFoundError();
    return relations;
  }

  /** The people the unit side of a ticket means: its assignee, else the desk manager (never for a personal ticket without an assignee). */
  unitRecipients(ticket: TicketRow): string[] {
    if (ticket.assigneeUserId) return [ticket.assigneeUserId];
    return !ticket.isPersonal && ticket.deskManagerUserId ? [ticket.deskManagerUserId] : [];
  }
}
