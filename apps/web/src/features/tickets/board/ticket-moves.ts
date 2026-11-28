import { CorePermission, type TicketListItemDto, type TicketStatus } from '@arweqah-platform/shared';
import type { TicketAction } from '../api';

/** The permission key behind each action (the buttons of the ticket page and the moves of the board use the same ones). */
export const ACTION_KEY: Record<TicketAction, string> = {
  'request-close': CorePermission.TicketsRequestClose,
  'confirm-close': CorePermission.TicketsConfirmClose,
  'decline-close': CorePermission.TicketsDeclineClose,
  reopen: CorePermission.TicketsReopen,
  'close-without-execution': CorePermission.TicketsCloseWithoutExecution,
};

/** From a status, to a status: the action, given whether the person is the ticket's sender (a missing entry: no action leads there). */
const MOVES: Record<TicketStatus, Partial<Record<TicketStatus, (sender: boolean) => TicketAction | null>>> = {
  open: { close_requested: () => 'request-close', closed: () => 'close-without-execution' },
  close_requested: { closed: (sender) => (sender ? 'confirm-close' : 'close-without-execution'), open: (sender) => (sender ? 'decline-close' : null) },
  closed: { open: (sender) => (sender ? 'reopen' : null) },
};

/**
 * The action that moves a ticket to another status, by who moves it: the unit asks to close or closes without execution, the sender confirms,
 * declines or reopens. Null when no action leads there. The screen only proposes: the API decides by the ticket's relation to the person.
 */
export function moveAction(ticket: Pick<TicketListItemDto, 'status' | 'sender'>, to: TicketStatus, viewerId: string | undefined): TicketAction | null {
  const sender = viewerId !== undefined && ticket.sender.id === viewerId;
  return MOVES[ticket.status][to]?.(sender) ?? null;
}

/** The statuses this person may move the ticket to: an action leads there and they hold its key. */
export function moveTargets(ticket: Pick<TicketListItemDto, 'status' | 'sender'>, statuses: readonly TicketStatus[], viewerId: string | undefined, can: (key: string) => boolean): TicketStatus[] {
  return statuses.filter((to) => {
    const action = moveAction(ticket, to, viewerId);
    return action !== null && can(ACTION_KEY[action]);
  });
}
