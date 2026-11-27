import { CorePermission } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import type { TicketViewer } from '../../domain/types/ticket.types';

/**
 * Who is looking at tickets: the person, how far their view permission reaches (the tickets of the people in that scope),
 * and which departments they may handle through the reply permission (their tickets: reply, ask to close, close without execution).
 */
export function viewerOf(ctx: AccessContext): TicketViewer {
  return { userId: ctx.userId, canAnswerReply: ctx.has(CorePermission.TicketsCommentReply), canMention: ctx.has(CorePermission.TicketsCommentMention), canEditReply: ctx.has(CorePermission.TicketsReplyEdit), canConfirmClose: ctx.has(CorePermission.TicketsConfirmClose), canExport: ctx.has(CorePermission.TicketsExport), view: ctx.nodeScopeOf(CorePermission.TicketsView), handle: ctx.nodeScopeOf(CorePermission.TicketsReply), reassign: ctx.nodeScopeOf(CorePermission.TicketsReassign), chooseHandler: ctx.nodeScopeOf(CorePermission.TicketsChooseHandler), delete: ctx.nodeScopeOf(CorePermission.TicketsDelete), deleteOwn: ctx.scopeOf(CorePermission.TicketsDelete) !== null };
}
