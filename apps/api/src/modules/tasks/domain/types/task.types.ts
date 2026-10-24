import type { ObjectionReason, ObjectionStatus, PermissionScope, TaskEventType, TaskGrouping, TaskPolicyInput, TaskPriority, TaskRecurrence, TaskSortKey, TaskSource, TaskStatus, TaskTab } from '@arweqah-platform/shared';

/** A person as the task rules need them: who they report to and where they sit. */
export interface TaskPerson {
  userId: string;
  name: string;
  employeeId: string | null;
  managerEmployeeId: string | null;
  managerUserId: string | null;
  orgNodeId: string | null;
  companyId: string | null;
}

/** Who is asking: their person facts and how far each team-reaching key of theirs goes. */
export interface TaskViewer {
  userId: string;
  employeeId: string | null;
  companyId: string | null;
  /** The viewer's unit and every unit below it. */
  subtreeNodeIds: readonly string[];
  /** The scope of a key (null = the viewer does not hold it). */
  scopes: Readonly<Record<string, PermissionScope | null>>;
}

/** A task with the names and places the rules and the screens need, read in one query. */
export interface TaskRow {
  id: string;
  number: string;
  companyId: string;
  title: string;
  description: string;
  assigneeUserId: string;
  assigneeName: string;
  assigneeEmployeeId: string | null;
  assigneeManagerEmployeeId: string | null;
  assigneeManagerUserId: string | null;
  assigneeOrgNodeId: string | null;
  assigneeCompanyId: string | null;
  creatorUserId: string;
  creatorName: string;
  reviewerUserId: string | null;
  reviewerName: string | null;
  approverUserId: string | null;
  approverName: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  estimateMinutes: number | null;
  tagId: string | null;
  tagNameAr: string | null;
  tagNameEn: string | null;
  tagOrgNodeId: string | null;
  tagIsActive: boolean | null;
  urgentManual: boolean;
  needsReview: boolean;
  recurrence: TaskRecurrence;
  recurrenceEnd: string | null;
  recurrenceParentId: string | null;
  source: TaskSource;
  projectId: string | null;
  ticketId: string | null;
  completedAt: Date | null;
  completedOn: string | null;
  lastActivityAt: Date;
  archivedAt: Date | null;
  revision: number;
  loggedMinutes: number;
  followers: number;
  isFollowing: boolean;
  hasOpenObjection: boolean;
}

export interface NewTask {
  companyId: string;
  title: string;
  description: string;
  assigneeUserId: string;
  creatorUserId: string;
  reviewerUserId: string | null;
  approverUserId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  estimateMinutes: number | null;
  tagId: string | null;
  urgentManual: boolean;
  needsReview: boolean;
  recurrence: TaskRecurrence;
  recurrenceEnd: string | null;
  recurrenceParentId: string | null;
  source: TaskSource;
  ticketId: string | null;
  projectId: string | null;
}

/** The columns a service may change; the repository checks and bumps the revision. */
export interface TaskPatch {
  title?: string;
  description?: string;
  assigneeUserId?: string;
  reviewerUserId?: string | null;
  approverUserId?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  estimateMinutes?: number | null;
  tagId?: string | null;
  urgentManual?: boolean;
  needsReview?: boolean;
  completedAt?: Date | null;
  completedOn?: string | null;
  lastActivityAt?: Date;
  archivedAt?: Date | null;
  remindedAt?: Date | null;
  overdueNotifiedAt?: Date | null;
  estimateNotifiedAt?: Date | null;
}

export interface NewTaskEvent {
  taskId: string;
  type: TaskEventType;
  actorUserId: string | null;
  fromStatus?: TaskStatus | null;
  toStatus?: TaskStatus | null;
  note?: string | null;
}

export interface TaskEventRow {
  id: string;
  type: TaskEventType;
  actorUserId: string | null;
  actorName: string | null;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  note: string | null;
  createdAt: Date;
}

export interface TaskObjectionRow {
  id: string;
  taskId: string;
  reason: ObjectionReason;
  note: string | null;
  status: ObjectionStatus;
  raisedByUserId: string;
  raisedByName: string;
  expiresAt: Date;
}

export interface NewObjection {
  taskId: string;
  raisedByUserId: string;
  reason: ObjectionReason;
  note: string | null;
  expiresAt: Date;
}

export interface TagRecord {
  id: string;
  orgNodeId: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  companyId: string;
}

export type PolicyRecord = TaskPolicyInput & { companyId: string };

/**
 * A query over tasks: the tab says the relation (assigned to me, created by me, followed by me, or the team), and the
 * team reach narrows the team to direct reports or to everyone below the viewer.
 */
export interface TaskListFilters {
  viewer: TaskViewer;
  tab: TaskTab | 'team';
  /** For the team page: the key whose scope bounds who is in the team. */
  teamKey?: string;
  reach?: 'direct' | 'all';
  status?: TaskStatus;
  openOnly?: boolean;
  priority?: TaskPriority;
  assigneeId?: string;
  tagId?: string;
  stale?: boolean;
  overdue?: boolean;
  archived?: boolean;
  search?: string;
  groupBy?: TaskGrouping;
  sort: TaskSortKey;
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
  today: string;
  now: Date;
  /** The viewer's company policy: days without movement that make a task stale. */
  staleDays: number;
}

/** What a background job needs to tell people about a task. */
export interface TaskNoticeTarget {
  id: string;
  number: string;
  title: string;
  assigneeUserId: string;
  creatorUserId: string;
}

/** An open task a person works on or reviews, found when they leave. */
export interface OpenWorkRow extends TaskNoticeTarget {
  reviewerUserId: string | null;
  status: TaskStatus;
  revision: number;
  projectId: string | null;
}

/** Overdue tasks of the direct reports of one manager (for the Sunday digest). */
export interface DigestRow {
  managerUserId: string;
  overdue: number;
}
