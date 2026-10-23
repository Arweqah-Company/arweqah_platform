import type { TicketAbilitiesDto, TicketCloseReason, TicketRelation, TicketStatus } from '@arweqah-platform/shared';

const DAY_MS = 86_400_000;

export type TicketAction = 'request_close' | 'close_without_execution' | 'confirm_close' | 'decline_close' | 'reopen' | 'auto_close' | 'sender_reply';

export interface Transition {
  status: TicketStatus;
  closeReason: TicketCloseReason | null;
}

/** Which status each action leads to, from which statuses. Pure: no clock, no data. */
const TRANSITIONS: Record<TicketAction, { from: TicketStatus[]; to: Transition }> = {
  request_close: { from: ['open'], to: { status: 'close_requested', closeReason: null } },
  close_without_execution: { from: ['open', 'close_requested'], to: { status: 'closed', closeReason: 'not_executed' } },
  confirm_close: { from: ['close_requested'], to: { status: 'closed', closeReason: 'confirmed' } },
  decline_close: { from: ['close_requested'], to: { status: 'open', closeReason: null } },
  sender_reply: { from: ['close_requested'], to: { status: 'open', closeReason: null } },
  auto_close: { from: ['close_requested'], to: { status: 'closed', closeReason: 'auto' } },
  reopen: { from: ['closed'], to: { status: 'open', closeReason: null } },
};

/** The next state, or null when the action is not allowed from this status. */
export function nextState(action: TicketAction, status: TicketStatus): Transition | null {
  const rule = TRANSITIONS[action];
  return rule.from.includes(status) ? rule.to : null;
}

/** Whole days left to reopen a closed ticket (rounded up), or null when it is not closed or the time is over. */
export function reopenDaysLeft(status: TicketStatus, closedAt: Date | null, windowDays: number, now: Date): number | null {
  if (status !== 'closed' || !closedAt) return null;
  const left = Math.ceil((closedAt.getTime() + windowDays * DAY_MS - now.getTime()) / DAY_MS);
  return left > 0 ? left : null;
}

/** The relations that stand on the unit's side of a ticket: its assignee, the manager of its desk, and whoever handles its department by scope. */
const UNIT_SIDE: TicketRelation[] = ['assignee', 'manager', 'desk'];

/** What each relation may do now. The sender replies to an open ticket; the unit (assignee or manager) closes it. */
export function abilitiesFor(relations: readonly TicketRelation[], status: TicketStatus, reopenLeft: number | null): TicketAbilitiesDto {
  const sender = relations.includes('sender');
  const unit = UNIT_SIDE.some((relation) => relations.includes(relation));
  const live = status !== 'closed';
  return {
    reply: live && (sender || unit),
    requestClose: unit && status === 'open',
    closeWithoutExecution: unit && live,
    confirmClose: sender && status === 'close_requested',
    declineClose: sender && status === 'close_requested',
    reopen: sender && status === 'closed' && reopenLeft !== null,
  };
}
