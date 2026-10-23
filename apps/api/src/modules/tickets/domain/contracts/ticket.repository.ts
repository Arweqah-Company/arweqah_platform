import type { Paginated, TicketGrouping } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type {
  AttachmentRow,
  FilterOptionsRows,
  NewEvent,
  NewTicket,
  TicketEventRow,
  TicketListFilters,
  TicketPatch,
  TicketRow,
} from '../types/ticket.types';

export abstract class TicketRepository {
  abstract insert(data: NewTicket, tx: TransactionContext): Promise<string>;
  abstract appendEvent(event: NewEvent, tx: TransactionContext): Promise<string>;
  /** Pass the transaction to read a ticket that was just written in it. */
  abstract find(id: string, tx?: TransactionContext): Promise<TicketRow | null>;
  /** Applies the patch only if the revision is still `expectedRevision` (and bumps it); false when someone else changed the ticket first. */
  abstract patch(id: string, expectedRevision: number, patch: TicketPatch, tx: TransactionContext): Promise<boolean>;
  abstract list(filters: TicketListFilters): Promise<Paginated<TicketRow> & { groupBy: TicketGrouping | null }>;
  abstract events(ticketId: string): Promise<TicketEventRow[]>;
  abstract attachments(eventIds: string[]): Promise<AttachmentRow[]>;
  /** A file attached to this ticket (to authorize its download), or null. */
  abstract attachedFile(ticketId: string, fileId: string): Promise<boolean>;
  abstract filterOptions(viewerUserId: string): Promise<FilterOptionsRows>;
  /** Open tickets quiet for longer than their desk's stale period that were not announced for the current quiet period. */
  abstract staleCandidates(now: Date): Promise<TicketRow[]>;
  abstract markStaleNotified(ids: string[], at: Date): Promise<void>;
  /** Open personal tickets of a type whose assignee is no longer an active employee go to the new assignee; returns how many. */
  abstract reassignOrphanedPersonal(typeId: string, newAssigneeUserId: string, tx: TransactionContext): Promise<number>;
  /** Open personal tickets of a type whose assignee is inactive (counted for the manager, never listed). */
  abstract orphanedPersonalCount(deskId: string): Promise<number>;
}
