import type { DeskFigureRows, TicketRow } from '../types/ticket.types';

export abstract class TicketFiguresRepository {
  abstract deskFigures(deskId: string, since: Date): Promise<DeskFigureRows>;
  /** Not closed and overdue or stale, never personal ones (the manager does not see those). */
  abstract needsAttention(deskId: string, today: string, now: Date): Promise<TicketRow[]>;
}
