import type { TicketStatus } from './schemas';

/** One ticket in the short lists of the home page. */
export interface TicketSummaryItemDto {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  neededBy: string;
  deskNameAr: string;
  deskNameEn: string;
  isPersonal: boolean;
}

/** What a person has going on with tickets: what they sent, and what waits for them. Personal tickets count for their sender and assignee only. */
export interface TicketSummaryDto {
  /** Sent by the person and not closed. */
  sentOpen: number;
  /** Sent by the person, and the unit asked to close it: it waits for their confirmation. */
  awaitingMyConfirmation: number;
  /** Open, for the person to handle (assignee, or desk manager when nobody is assigned), and the last word was not theirs. */
  awaitingMyReply: number;
  sent: TicketSummaryItemDto[];
  waiting: TicketSummaryItemDto[];
}
