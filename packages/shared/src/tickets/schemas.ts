import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { paginationQuerySchema, type Paginated } from '../common/pagination';
import type { ReactionSummaryDto } from '../reactions';

export const TICKET_STATUSES = ['open', 'close_requested', 'closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_CLOSE_REASONS = ['confirmed', 'auto', 'not_executed'] as const;
export type TicketCloseReason = (typeof TICKET_CLOSE_REASONS)[number];

/** `active` receives tickets; `paused` is shown but disabled; `stopped` is not shown at all. */
export const RECEPTION_STATUSES = ['active', 'paused', 'stopped'] as const;
export type ReceptionStatus = (typeof RECEPTION_STATUSES)[number];

/** Why a desk cannot take a ticket right now (null when it can). */
export const DESK_UNAVAILABLE_REASONS = ['paused', 'not_started', 'no_manager'] as const;
export type DeskUnavailableReason = (typeof DESK_UNAVAILABLE_REASONS)[number];

export const TICKET_EVENT_TYPES = ['created', 'reply', 'close_requested', 'close_declined', 'confirmed', 'auto_closed', 'closed_not_executed', 'reopened', 'reassigned'] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const TICKET_GROUPINGS = ['assignee', 'status', 'desk', 'type'] as const;
export type TicketGrouping = (typeof TICKET_GROUPINGS)[number];

/** mine: sent by me; inbox: for me or my department to handle; team: of the people in my scope (when the view scope reaches further than my own). */
export const TICKET_TABS = ['mine', 'inbox', 'team'] as const;
export type TicketTab = (typeof TICKET_TABS)[number];

/** TKT-000123 */
export const formatTicketNumber = (n: number | string): string => `TKT-${String(n).padStart(6, '0')}`;

export const MAX_TICKET_FILES = 5;
export const MAX_TICKET_TEXT = 5000;
export const FIGURES_WINDOW_DAYS = 30;

/** Every duration is a whole number of days that the desk manager sets, inside these limits. */
export const DESK_LIMITS = {
  defaultDueDays: { min: 1, max: 60 },
  minLeadDays: { min: 0, max: 30 },
  autoCloseDays: { min: 1, max: 30 },
  reopenWindowDays: { min: 1, max: 60 },
  staleAfterDays: { min: 1, max: 90 },
} as const;
export const DESK_DEFAULTS = { defaultDueDays: 3, minLeadDays: 0, autoCloseDays: 4, reopenWindowDays: 7, staleAfterDays: 14 } as const;

const days = (key: keyof typeof DESK_LIMITS) => z.number().int().min(DESK_LIMITS[key].min).max(DESK_LIMITS[key].max);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const fileIds = z.array(z.uuid()).max(MAX_TICKET_FILES).default([]);

// ------------------------------------------------------------------ setup (desk manager / platform manager)

export const ticketDeskSettingsSchema = z.strictObject({
  receptionStatus: z.enum(RECEPTION_STATUSES),
  descriptionAr: optionalText(500),
  descriptionEn: optionalText(500),
  acceptsPersonal: z.boolean(),
  defaultDueDays: days('defaultDueDays'),
  minLeadDays: days('minLeadDays'),
  autoCloseDays: days('autoCloseDays'),
  reopenWindowDays: days('reopenWindowDays'),
  staleAfterDays: days('staleAfterDays'),
});
export type TicketDeskSettingsInput = z.infer<typeof ticketDeskSettingsSchema>;

export const ticketTypeInputSchema = z.strictObject({
  ...localizedNameSchema,
  descriptionAr: optionalText(300),
  descriptionEn: optionalText(300),
  /** What the sender must put in a ticket of this type (formatted text, sanitized by the API). */
  instructionsAr: optionalText(5000),
  instructionsEn: optionalText(5000),
  /** The employees (user ids) of the unit who answer tickets of this type; a personal type has exactly one. */
  handlerUserIds: z.array(z.uuid()).max(20).default([]),
  /** Working days; empty = the desk's default. */
  dueDays: days('defaultDueDays').nullable().optional(),
  isPersonal: z.boolean().default(false),
  isActive: z.boolean().default(true),
});
export type TicketTypeInput = z.infer<typeof ticketTypeInputSchema>;

// ------------------------------------------------------------------ tickets

export const createTicketSchema = z.strictObject({
  typeId: z.uuid(),
  title: z.string().trim().min(1).max(200),
  details: z.string().trim().max(MAX_TICKET_TEXT).default(''),
  /** 1 = urgent. */
  priority: z.union([z.literal(0), z.literal(1)]).meta({ optionLabels: { 0: { ar: 'عادية', en: 'Normal' }, 1: { ar: 'عاجلة', en: 'Urgent' } } }).default(0),
  /** ISO date; empty = today + the type's duration in working days. */
  neededBy: z.iso.date().optional(),
  fileIds,
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/** A reply, or (with `parentEventId`) an answer to one. People are named in the text as `{{mention:<user id>}}` (see `mentionedIn`). */
/** `confirmClose`: the sender of a ticket that waits for their confirmation sends this reply and confirms the closing in the same step (without it, the sender's reply returns the ticket to «open»). */
export const ticketReplySchema = z.strictObject({ body: z.string().trim().min(1).max(MAX_TICKET_TEXT), fileIds, parentEventId: z.uuid().optional(), confirmClose: z.boolean().optional() });
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;

/** The new text of one's own reply (its files stay as they are). Mentions follow the same `{{mention:<user id>}}` rule. */
export const editTicketReplySchema = z.strictObject({ body: z.string().trim().min(1).max(MAX_TICKET_TEXT) });
export type EditTicketReplyInput = z.infer<typeof editTicketReplySchema>;

/** The unit asks to close, or the sender declines the closing, optionally with a message. */
export const ticketMentionablesQuerySchema = z.strictObject({ search: z.string().trim().max(100).optional() });
export type TicketMentionablesQuery = z.infer<typeof ticketMentionablesQuerySchema>;

/** The unit gives the ticket to another employee (inside the reach of the person's reassign key). */
export const reassignTicketSchema = z.strictObject({ assigneeUserId: z.uuid() });
export type ReassignTicketInput = z.infer<typeof reassignTicketSchema>;

/** The head picks one of the handlers named on the ticket's type to answer a ticket nobody has taken. */
export const chooseHandlerSchema = z.strictObject({ handlerUserId: z.uuid() });
export type ChooseHandlerInput = z.infer<typeof chooseHandlerSchema>;

export const ticketActionSchema = z.strictObject({ message: z.string().trim().max(MAX_TICKET_TEXT).optional() });
export type TicketActionInput = z.infer<typeof ticketActionSchema>;

/** How the ticket lists are ordered: by the last activity (the default) or by when the ticket was sent. */
export const TICKET_SORT_KEYS = ['activity', 'created'] as const;
export type TicketSortKey = (typeof TICKET_SORT_KEYS)[number];

export const ticketsQuerySchema = paginationQuerySchema.extend({
  tab: z.enum(TICKET_TABS).default('mine'),
  deskId: z.uuid().optional(),
  typeId: z.uuid().optional(),
  assigneeId: z.uuid().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  groupBy: z.enum(TICKET_GROUPINGS).optional(),
  sort: z.enum(TICKET_SORT_KEYS).default('activity'),
  /** `desc` = the newest first. */
  dir: z.enum(['asc', 'desc']).default('desc'),
  /** Adds each ticket's text to the rows (the export asks for it; the table and the board do not). */
  withDetails: z.stringbool().optional(),
});
export type TicketsQuery = z.infer<typeof ticketsQuerySchema>;

export const ticketFiguresQuerySchema = z.strictObject({ deskId: z.uuid().optional() });
export type TicketFiguresQuery = z.infer<typeof ticketFiguresQuerySchema>;

// ------------------------------------------------------------------ read models

export interface PersonRefDto {
  id: string;
  name: string;
}

export interface TicketTypeDto {
  id: string;
  deskId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  instructionsAr: string | null;
  instructionsEn: string | null;
  handlers: PersonRefDto[];
  /** Null = the desk's default. */
  dueDays: number | null;
  isPersonal: boolean;
  isActive: boolean;
}

export interface TicketDeskSettingsDto {
  receptionStatus: ReceptionStatus;
  descriptionAr: string | null;
  descriptionEn: string | null;
  acceptsPersonal: boolean;
  defaultDueDays: number;
  minLeadDays: number;
  autoCloseDays: number;
  reopenWindowDays: number;
  staleAfterDays: number;
}

/** An organization department that can be set up as a ticket desk. */
export interface TicketDeskDto {
  /** The department (organization node) id. */
  orgNodeId: string;
  /** The unit above, or null at the top of the structure. */
  parentId: string | null;
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  nameAr: string;
  nameEn: string;
  pathAr: string;
  pathEn: string;
  startDate: string;
  manager: PersonRefDto | null;
  settings: TicketDeskSettingsDto;
  types: TicketTypeDto[];
}

export interface CatalogTypeDto {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  /** Formatted text (already sanitized) telling the sender what to put in the ticket. */
  instructionsAr: string | null;
  instructionsEn: string | null;
  isPersonal: boolean;
  /** Working days the unit usually needs. */
  dueDays: number;
  /** Who answers tickets of this type (active ones). */
  handlers: PersonRefDto[];
  /** Personal types of a desk that cannot take them are listed as unavailable. */
  available: boolean;
}

export interface CatalogDeskDto {
  deskId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  /** Null when tickets can be sent to this desk now. */
  unavailableReason: DeskUnavailableReason | null;
  minLeadDays: number;
  types: CatalogTypeDto[];
}

export interface TicketCatalogDto {
  desks: CatalogDeskDto[];
  /** Today, so the form and the server agree on "today" when computing dates. */
  today: string;
}

export interface TicketListItemDto {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  closeReason: TicketCloseReason | null;
  priority: 0 | 1;
  neededBy: string;
  isPersonal: boolean;
  deskId: string;
  deskNameAr: string;
  deskNameEn: string;
  typeId: string;
  typeNameAr: string;
  typeNameEn: string;
  sender: PersonRefDto;
  assignee: PersonRefDto | null;
  createdAt: string;
  lastActivityAt: string;
  /** Needed-by date passed and not closed. */
  overdue: boolean;
  /** Open with no activity for the desk's stale period. */
  stale: boolean;
  /** Nobody from the unit has answered yet. */
  isNew: boolean;
  /** The ticket's text; only when the list was asked `withDetails`. */
  details?: string;
  /** On the rows of the list: the viewer may delete this ticket (their key reaches its department, or they sent it and hold the key). */
  canDelete?: boolean;
}

export interface TicketAttachmentDto {
  fileId: string;
  originalName: string;
  contentType: string;
  size: number;
}

export interface TicketEventDto {
  id: string;
  type: TicketEventType;
  actor: PersonRefDto | null;
  body: string | null;
  /** The first-level reply this one answers (null for a first-level entry). */
  parentId: string | null;
  /** The person this reply answers (for a `reassigned` entry: the new assignee). */
  replyTo: PersonRefDto | null;
  mentions: PersonRefDto[];
  attachments: TicketAttachmentDto[];
  createdAt: string;
  /** The author changed the text after sending it (the screen shows «edited» next to the time). */
  isEdited: boolean;
  /** This person may change this reply now: their own, within the edit window, the ticket takes replies, and they hold the key. */
  mayEdit: boolean;
  /** The reactions on this reply (only replies carry any). */
  reactions: ReactionSummaryDto[];
}

/** How a person is related to a ticket: sender, assignee, manager of its desk, handler through the reply scope (`desk`), in sight through the view scope (`team`), or named with @ in a reply (`mentioned`: reads and answers, nothing more). */
export type TicketRelation = 'sender' | 'assignee' | 'manager' | 'desk' | 'team' | 'mentioned';

/** What this person may do with the ticket right now (the server decides; the screen only shows it). */
export interface TicketAbilitiesDto {
  reply: boolean;
  requestClose: boolean;
  closeWithoutExecution: boolean;
  confirmClose: boolean;
  declineClose: boolean;
  reopen: boolean;
  /** The unit side may hand an open ticket to someone else inside the reach of its reassign key. */
  reassign: boolean;
  /** A ticket of a type with several handlers that nobody has taken: the unit's head picks who answers it. */
  chooseHandler: boolean;
  /** The viewer's `tickets.delete` reaches the ticket's department. */
  delete: boolean;
}

export interface TicketDto extends TicketListItemDto {
  details: string;
  /** Who answers it while nobody has taken it: the handlers of its type (empty once it has an assignee, and for a personal ticket). */
  handlers: PersonRefDto[];
  relations: TicketRelation[];
  abilities: TicketAbilitiesDto;
  events: TicketEventDto[];
  /** Days left of the reopen window for a closed ticket (null when not applicable or over). */
  reopenDaysLeft: number | null;
  closeRequestedAt: string | null;
  closedAt: string | null;
}

export interface TicketsPageDto extends Paginated<TicketListItemDto> {
  /** Server-side grouping order of the page, when `groupBy` was asked for. */
  groupBy: TicketGrouping | null;
}

export interface TicketFilterOptionsDto {
  desks: { id: string; nameAr: string; nameEn: string }[];
  types: { id: string; deskId: string; nameAr: string; nameEn: string }[];
  assignees: PersonRefDto[];
  /** The inbox tab is offered to those who are assignees or desk managers, or whose reply scope reaches departments. */
  hasInbox: boolean;
  /** The team tab is offered to those whose view scope reaches further than their own tickets. */
  hasTeam: boolean;
}

/** Which department a breakdown row belongs to (the page shows it as a column when every department is chosen). */
export interface FiguresDeskRef {
  deskId: string;
  deskNameAr: string;
  deskNameEn: string;
}

/** The figures of the chosen department, or the sum of all of them when none is chosen. */
export interface TicketFiguresBlockDto {
  needsAttention: TicketListItemDto[];
  openNow: number;
  incoming: number;
  /** Average hours from arrival to first answer; null without data. */
  avgFirstResponseHours: number | null;
  avgResolutionHours: number | null;
  outcomes: { confirmed: number; auto: number; notExecuted: number; reopened: number };
  /** Tickets of personal types are counted here only, never listed. */
  personalCount: number;
  byType: (FiguresDeskRef & { typeId: string; nameAr: string; nameEn: string; count: number })[];
  byAssignee: (FiguresDeskRef & { userId: string | null; name: string | null; open: number; closed: number; avgFirstResponseHours: number | null })[];
}

export interface TicketFiguresDto {
  windowDays: number;
  /** Every department the person may see (the choices of the filter). */
  desks: { id: string; nameAr: string; nameEn: string }[];
  /** `all`: the figures add up every department; `desk`: one department. */
  scope: 'all' | 'desk';
  figures: TicketFiguresBlockDto;
}
