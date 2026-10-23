import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { paginationQuerySchema, type Paginated } from '../common/pagination';

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

export const TICKET_EVENT_TYPES = ['created', 'reply', 'close_requested', 'close_declined', 'confirmed', 'auto_closed', 'closed_not_executed', 'reopened'] as const;
export type TicketEventType = (typeof TICKET_EVENT_TYPES)[number];

export const TICKET_GROUPINGS = ['assignee', 'status', 'desk', 'type'] as const;
export type TicketGrouping = (typeof TICKET_GROUPINGS)[number];

export const TICKET_TABS = ['mine', 'inbox'] as const;
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
  /** The employee (user id) who handles tickets of this type. Required for personal types. */
  defaultAssigneeUserId: z.uuid().nullable().optional(),
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
  priority: z.union([z.literal(0), z.literal(1)]).default(0),
  /** ISO date; empty = today + the type's duration in working days. */
  neededBy: z.iso.date().optional(),
  fileIds,
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketReplySchema = z.strictObject({ body: z.string().trim().min(1).max(MAX_TICKET_TEXT), fileIds });
export type TicketReplyInput = z.infer<typeof ticketReplySchema>;

/** The unit asks to close, or the sender declines the closing, optionally with a message. */
export const ticketActionSchema = z.strictObject({ message: z.string().trim().max(MAX_TICKET_TEXT).optional() });
export type TicketActionInput = z.infer<typeof ticketActionSchema>;

export const ticketsQuerySchema = paginationQuerySchema.extend({
  tab: z.enum(TICKET_TABS).default('mine'),
  deskId: z.uuid().optional(),
  typeId: z.uuid().optional(),
  assigneeId: z.uuid().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  groupBy: z.enum(TICKET_GROUPINGS).optional(),
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
  defaultAssignee: PersonRefDto | null;
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
  isPersonal: boolean;
  /** Working days the unit usually needs. */
  dueDays: number;
  assignee: PersonRefDto | null;
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
  attachments: TicketAttachmentDto[];
  createdAt: string;
}

export type TicketRelation = 'sender' | 'assignee' | 'manager';

/** What this person may do with the ticket right now (the server decides; the screen only shows it). */
export interface TicketAbilitiesDto {
  reply: boolean;
  requestClose: boolean;
  closeWithoutExecution: boolean;
  confirmClose: boolean;
  declineClose: boolean;
  reopen: boolean;
}

export interface TicketDto extends TicketListItemDto {
  details: string;
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
  /** The inbox tab is offered to those who are assignees or desk managers. */
  hasInbox: boolean;
}

export interface TicketFiguresDeskDto {
  deskId: string;
  nameAr: string;
  nameEn: string;
  needsAttention: TicketListItemDto[];
  openNow: number;
  incoming: number;
  /** Average hours from arrival to first answer; null without data. */
  avgFirstResponseHours: number | null;
  avgResolutionHours: number | null;
  outcomes: { confirmed: number; auto: number; notExecuted: number; reopened: number };
  /** Tickets of personal types are counted here only, never listed. */
  personalCount: number;
  byType: { typeId: string; nameAr: string; nameEn: string; count: number }[];
  byAssignee: { userId: string | null; name: string | null; open: number; closed: number; avgFirstResponseHours: number | null }[];
}

export interface TicketFiguresDto {
  windowDays: number;
  desks: TicketFiguresDeskDto[];
}
