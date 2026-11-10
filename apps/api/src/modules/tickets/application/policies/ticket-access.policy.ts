import { Injectable } from '@nestjs/common';
import type { TicketRelation } from '@arweqah-platform/shared';
import { TicketNotFoundError } from '../../domain/errors/ticket.errors';
import type { TicketRow, TicketViewer, ViewerScope } from '../../domain/types/ticket.types';

/** Is the place (a desk, or where a person sits) inside the scope? */
function inScope(scope: ViewerScope, place: { orgNodeId: string | null; companyId: string | null }): boolean {
  if (scope.kind === 'all') return true;
  if (scope.kind === 'company') return place.companyId === scope.companyId;
  return scope.kind === 'nodes' && !!place.orgNodeId && scope.ids.includes(place.orgNodeId);
}

/**
 * Who sees a ticket follows the person's relation to it: the sender, the assignee, the manager of the desk, a person whose reply
 * permission reaches the desk (`desk`), and a person whose view permission reaches its sender or assignee (`team`).
 * A personal ticket is never shown to anyone else, whatever their scope: only the sender and the assignee.
 * Anybody else gets "not found", never "forbidden", so the ticket's existence is not revealed.
 */
@Injectable()
export class TicketAccessPolicy {
  relationsOf(viewer: TicketViewer, ticket: TicketRow): TicketRelation[] {
    const relations: TicketRelation[] = [];
    if (ticket.senderUserId === viewer.userId) relations.push('sender');
    if (ticket.assigneeUserId === viewer.userId) relations.push('assignee');
    if (ticket.isPersonal) return relations;
    if (ticket.mentionedUserIds.includes(viewer.userId)) relations.push('mentioned');
    if (ticket.deskManagerUserId === viewer.userId) relations.push('manager');
    if (inScope(viewer.handle, { orgNodeId: ticket.deskId, companyId: ticket.deskCompanyId })) relations.push('desk');
    const sender = { orgNodeId: ticket.senderNodeId, companyId: ticket.senderCompanyId };
    const assignee = { orgNodeId: ticket.assigneeNodeId, companyId: ticket.assigneeCompanyId };
    if (inScope(viewer.view, sender) || (ticket.assigneeUserId !== null && inScope(viewer.view, assignee))) relations.push('team');
    return relations;
  }

  /** The relations of someone allowed to see the ticket; throws 404 for everybody else. */
  assertCanView(viewer: TicketViewer, ticket: TicketRow | null): TicketRelation[] {
    const relations = ticket ? this.relationsOf(viewer, ticket) : [];
    if (!ticket || relations.length === 0) throw new TicketNotFoundError();
    return relations;
  }

  /** The people the unit side of a ticket means: its assignee, else the desk manager (never for a personal ticket without an assignee). */
  unitRecipients(ticket: TicketRow): string[] {
    if (ticket.assigneeUserId) return [ticket.assigneeUserId];
    return !ticket.isPersonal && ticket.deskManagerUserId ? [ticket.deskManagerUserId] : [];
  }
}
