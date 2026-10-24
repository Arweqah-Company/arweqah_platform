import type { TicketStatus } from '@arweqah-platform/shared';

export interface TicketSummaryCounts {
  sentOpen: number;
  awaitingMyConfirmation: number;
  awaitingMyReply: number;
}

export interface TicketSummaryRow {
  id: string;
  number: string;
  title: string;
  status: TicketStatus;
  neededBy: string;
  deskId: string;
  isPersonal: boolean;
}

/** What the home page shows about a person's tickets; counted by the database, in the person's own terms (sent by them, or waiting for them). */
export abstract class TicketSummaryRepository {
  abstract counts(userId: string): Promise<TicketSummaryCounts>;
  /** Sent by the person and not closed; those waiting for their confirmation first. */
  abstract sent(userId: string, limit: number): Promise<TicketSummaryRow[]>;
  /** Open and waiting for the person to answer: as assignee, or as desk manager when nobody is assigned, and the last word was not theirs. */
  abstract waiting(userId: string, limit: number): Promise<TicketSummaryRow[]>;
}
