import type { DeskUnavailableReason, ReceptionStatus, TicketStatus } from '@arweqah-platform/shared';

const DAY_MS = 86_400_000;

/** The needed-by date has passed and the ticket is not closed. */
export const isOverdue = (neededBy: string, status: TicketStatus, today: string): boolean => status !== 'closed' && neededBy < today;

/** Open with no activity for `staleAfterDays` calendar days. */
export const isStale = (status: TicketStatus, lastActivityAt: Date, staleAfterDays: number, now: Date): boolean =>
  status === 'open' && now.getTime() - lastActivityAt.getTime() >= staleAfterDays * DAY_MS;

/** Nobody from the unit has answered yet. */
export const isNewTicket = (firstResponseAt: Date | null, status: TicketStatus): boolean => status !== 'closed' && firstResponseAt === null;

export interface DeskFacts {
  receptionStatus: ReceptionStatus;
  startDate: string;
  hasManager: boolean;
}

/**
 * Why tickets cannot be sent to this desk right now, or null when they can.
 * `stopped` desks are not offered at all, so they answer "stopped" here only for a direct attempt.
 */
export function deskUnavailableReason(desk: DeskFacts, today: string): DeskUnavailableReason | 'stopped' | null {
  if (desk.receptionStatus === 'stopped') return 'stopped';
  if (desk.receptionStatus === 'paused') return 'paused';
  if (desk.startDate > today) return 'not_started';
  if (!desk.hasManager) return 'no_manager';
  return null;
}
