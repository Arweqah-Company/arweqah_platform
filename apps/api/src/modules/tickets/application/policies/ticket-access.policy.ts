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

/** The assignee, or (on a ticket that is not personal) a handler of the ticket's type: they answer it like its assignee. A personal ticket stays with its stored assignee even when the type's handlers change. */
const isAssignee = (viewer: TicketViewer, ticket: TicketRow): boolean => ticket.assigneeUserId === viewer.userId || (!ticket.isPersonal && ticket.typeHandlerUserIds.includes(viewer.userId));

/**
 * Who sees a ticket follows the person's relation to it: the sender, the assignee or a handler of its type, the manager of the desk, a person whose reply
 * permission reaches the desk (`desk`), and a person whose view permission reaches its sender or assignee (`team`).
 * A personal ticket is never shown to anyone else, whatever their scope: only the sender and the assignee.
 * Anybody else gets "not found", never "forbidden", so the ticket's existence is not revealed.
 */
@Injectable()
export class TicketAccessPolicy {
  relationsOf(viewer: TicketViewer, ticket: TicketRow): TicketRelation[] {
    const relations: TicketRelation[] = [];
    if (ticket.senderUserId === viewer.userId) relations.push('sender');
    if (isAssignee(viewer, ticket)) relations.push('assignee');
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

  /**
   * Where the person may hand this ticket: the company and the departments (null = the whole company) its new assignee must sit in.
   * Null when the ticket is personal, closed, or its desk is outside the reach of the person's reassign key.
   */
  reassignReach(viewer: TicketViewer, ticket: TicketRow): { companyId: string; nodeIds: readonly string[] | null } | null {
    const desk = { orgNodeId: ticket.deskId, companyId: ticket.deskCompanyId };
    if (ticket.isPersonal || ticket.status === 'closed' || !inScope(viewer.reassign, desk)) return null;
    return { companyId: ticket.deskCompanyId, nodeIds: viewer.reassign.kind === 'nodes' ? viewer.reassign.ids : null };
  }

  /** The people the unit side of a ticket means: its assignee, else the handlers of its type and the desk manager (never for a personal ticket without an assignee). */
  unitRecipients(ticket: TicketRow): string[] {
    if (ticket.assigneeUserId) return [ticket.assigneeUserId];
    const manager = !ticket.isPersonal && ticket.deskManagerUserId ? [ticket.deskManagerUserId] : [];
    return [...new Set([...ticket.typeHandlerUserIds, ...manager])];
  }
}
