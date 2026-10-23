import type { DeskFigureRows, TicketRow } from '../types/ticket.types';

export abstract class TicketFiguresRepository {
  /** The figures of these desks added together (one id = one desk). */
  abstract deskFigures(deskIds: string[], since: Date): Promise<DeskFigureRows>;
  /** Not closed and overdue or stale, never personal ones (the manager does not see those). */
  abstract needsAttention(deskIds: string[], today: string, now: Date): Promise<TicketRow[]>;
}
