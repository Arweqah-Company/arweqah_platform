import type { ReceptionStatus, TicketCloseReason, TicketFiguresBlockDto, TicketEventType, TicketGrouping, TicketStatus, TicketTab } from '@arweqah-platform/shared';

/** The settings of one desk as stored. */
export interface DeskRecord {
  orgNodeId: string;
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

export type DeskSettingsValues = Omit<DeskRecord, 'orgNodeId'>;

export interface TypeRecord {
  id: string;
  deskId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  instructionsAr: string | null;
  instructionsEn: string | null;
  /** The people who answer tickets of this type (employees of the unit). */
  handlers: { id: string; name: string }[];
  dueDays: number | null;
  isPersonal: boolean;
  isActive: boolean;
}

export type TypeValues = Omit<TypeRecord, 'id' | 'deskId' | 'handlers'> & { handlerUserIds: string[] };

/** A department of the organization, with what the ticket rules need to know about it. */
export interface DepartmentFacts {
  orgNodeId: string;
  /** The unit above, or null at the top of the structure. */
  parentId: string | null;
  companyId: string;
  /** ISO date. */
  startDate: string;
  managerUserId: string | null;
  managerName: string | null;
  /** User ids of the active managers of this unit and of every unit above it (they reach it as the leader of what contains it). */
  managersAbove: string[];
}

export interface PersonRecord {
  id: string;
  name: string;
}

/** A ticket with the names and the desk settings the rules and screens need. */
export interface TicketRow {
  id: string;
  number: number;
  senderUserId: string;
  senderName: string;
  deskId: string;
  typeId: string;
  typeNameAr: string;
  typeNameEn: string;
  title: string;
  details: string;
  priority: 0 | 1;
  neededBy: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  isPersonal: boolean;
  status: TicketStatus;
  closeReason: TicketCloseReason | null;
  firstResponseAt: Date | null;
  closeRequestedAt: Date | null;
  closedAt: Date | null;
  lastActivityAt: Date;
  reopenCount: number;
  staleNotifiedAt: Date | null;
  revision: number;
  createdAt: Date;
  deskManagerUserId: string | null;
  /** Where the sender, the assignee and the desk sit in the organization (for the scopes of the view and reply permissions). */
  senderNodeId: string | null;
  senderCompanyId: string | null;
  assigneeNodeId: string | null;
  assigneeCompanyId: string | null;
  deskCompanyId: string;
  deskStaleAfterDays: number;
  deskReopenWindowDays: number;
  deskAutoCloseDays: number;
  /** The people named with @ in the replies of this ticket (they may read and answer it). */
  mentionedUserIds: string[];
  /** The handlers of the ticket's type: they read and answer it like its assignee. */
  typeHandlerUserIds: string[];
}

export interface NewTicket {
  senderUserId: string;
  deskId: string;
  typeId: string;
  title: string;
  details: string;
  priority: 0 | 1;
  neededBy: string;
  assigneeUserId: string | null;
  isPersonal: boolean;
}

export interface NewEvent {
  ticketId: string;
  type: TicketEventType;
  actorUserId: string | null;
  body: string | null;
  fileIds: string[];
  parentEventId?: string | null;
  replyToUserId?: string | null;
  mentionIds?: string[];
}

export interface TicketEventRow {
  id: string;
  type: TicketEventType;
  actorUserId: string | null;
  actorName: string | null;
  body: string | null;
  parentEventId: string | null;
  replyToUserId: string | null;
  replyToName: string | null;
  createdAt: Date;
}

export interface MentionRow {
  eventId: string;
  userId: string;
  name: string;
}

export interface AttachmentRow {
  eventId: string;
  fileId: string;
  originalName: string;
  contentType: string;
  size: number;
}

/** Changes applied together with a revision check. */
export interface TicketPatch {
  status?: TicketStatus;
  closeReason?: TicketCloseReason | null;
  firstResponseAt?: Date;
  closeRequestedAt?: Date | null;
  closedAt?: Date | null;
  lastActivityAt?: Date;
  reopenCountIncrement?: boolean;
  assigneeUserId?: string;
  /** Hides the ticket from everyone (the delete button): set once, never cleared by the screens. */
  deletedAt?: Date;
}

/** Where a permission reaches (the same shape as the access module's, kept here so the domain imports nothing from outside). */
export type ViewerScope = { kind: 'none' } | { kind: 'nodes'; ids: readonly string[] } | { kind: 'company'; companyId: string } | { kind: 'all' };

/** Who is looking: the person, how far their view permission reaches, and which departments they may handle. */
export interface TicketViewer {
  userId: string;
  /** Whether the person's role has the two comment keys (the reply button on a reply, and @). */
  canAnswerReply: boolean;
  canMention: boolean;
  /** Whether the person's role has the key to confirm a closing (it lets the sender's reply confirm it too). */
  canConfirmClose: boolean;
  view: ViewerScope;
  handle: ViewerScope;
  /** The departments whose tickets the person may hand to someone else, and (the same scope) the people they may hand them to. */
  reassign: ViewerScope;
  /** The departments whose tickets the person may give to one of the handlers of the ticket's type. */
  chooseHandler: ViewerScope;
  /** The departments whose tickets the person may delete (hide). */
  delete: ViewerScope;
  /** Holds the delete key at any scope (`own` is the narrowest): the person may delete the tickets they sent themselves, whichever department got them. */
  deleteOwn: boolean;
}

export interface TicketListFilters {
  viewer: TicketViewer;
  tab: TicketTab;
  deskId?: string;
  typeId?: string;
  assigneeId?: string;
  status?: TicketStatus;
  search?: string;
  groupBy?: TicketGrouping;
  page: number;
  pageSize: number;
}

export interface FilterOptionsRows {
  desks: string[];
  types: { id: string; deskId: string; nameAr: string; nameEn: string }[];
  assignees: PersonRecord[];
  hasInbox: boolean;
  hasTeam: boolean;
}

/** Figures of some desks added together over a window of days: the shared figures without the department names and the list. */
export type DeskFigureRows = Omit<TicketFiguresBlockDto, 'needsAttention' | 'byType' | 'byAssignee'> & {
  byType: Omit<TicketFiguresBlockDto['byType'][number], 'deskNameAr' | 'deskNameEn'>[];
  byAssignee: Omit<TicketFiguresBlockDto['byAssignee'][number], 'deskNameAr' | 'deskNameEn'>[];
};
