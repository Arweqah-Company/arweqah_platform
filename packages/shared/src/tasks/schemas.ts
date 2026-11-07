import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { paginationQuerySchema, type Paginated } from '../common/pagination';
import {
  MAX_TASK_TEXT,
  OBJECTION_REASONS,
  TASK_GROUPINGS,
  TASK_POLICY_LIMITS,
  TASK_PRIORITIES,
  TASK_RECURRENCES,
  TASK_SORT_KEYS,
  TASK_STATUSES,
  TASK_TABS,
  type ObjectionReason,
  type ObjectionStatus,
  type TaskEventType,
  type TaskPriority,
  type TaskRecurrence,
  type TaskSource,
  type TaskStatus,
  type TaskPolicyKey,
} from './statuses';

const text = (max: number) => z.string().trim().max(max);
const policyNumber = (key: TaskPolicyKey) => z.number().int().min(TASK_POLICY_LIMITS[key].min).max(TASK_POLICY_LIMITS[key].max);

// ------------------------------------------------------------------ inputs

export const createTaskSchema = z.strictObject({
  title: text(200).min(1),
  description: text(MAX_TASK_TEXT).default(''),
  /** The user who must do it; empty = the creator (the task then waits for approval). */
  assigneeUserId: z.uuid().optional(),
  /** ISO date; empty = today. */
  dueDate: z.iso.date().optional(),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  estimateMinutes: z.number().int().min(1).max(100_000).nullable().optional(),
  tagId: z.uuid().nullable().optional(),
  urgent: z.boolean().default(false),
  needsReview: z.boolean().default(false),
  recurrence: z.enum(TASK_RECURRENCES).default('none'),
  /** Last date a recurring task may repeat. */
  recurrenceEnd: z.iso.date().nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Editable fields; a change of assignee is a new assignment and goes through the assignment rules again. */
export const updateTaskSchema = z.strictObject({
  title: text(200).min(1).optional(),
  description: text(MAX_TASK_TEXT).optional(),
  dueDate: z.iso.date().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  estimateMinutes: z.number().int().min(1).max(100_000).nullable().optional(),
  tagId: z.uuid().nullable().optional(),
  urgent: z.boolean().optional(),
  needsReview: z.boolean().optional(),
  revision: z.number().int().min(1),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/** Moving a task: the board and the buttons send this and nothing else. */
export const transitionTaskSchema = z.strictObject({
  to: z.enum(TASK_STATUSES),
  revision: z.number().int().min(1),
  /** Required when sending a task back from review; optional elsewhere. */
  note: text(MAX_TASK_TEXT).optional(),
  /** The real day the work ended, for finishing a task late (at most the back-dating days before today). */
  completedOn: z.iso.date().optional(),
});
export type TransitionTaskInput = z.infer<typeof transitionTaskSchema>;

export const decideTaskSchema = z.strictObject({ revision: z.number().int().min(1), note: text(MAX_TASK_TEXT).optional() });
export type DecideTaskInput = z.infer<typeof decideTaskSchema>;

export const objectTaskSchema = z.strictObject({ reason: z.enum(OBJECTION_REASONS), note: text(1000).optional() });
export type ObjectTaskInput = z.infer<typeof objectTaskSchema>;

/** Accepting an objection gives the task to somebody else: `newAssigneeUserId` says who (the API checks the giver may give it to them). */
export const answerObjectionSchema = z.strictObject({ accept: z.boolean(), note: text(1000).optional(), newAssigneeUserId: z.uuid().optional() });
export type AnswerObjectionInput = z.infer<typeof answerObjectionSchema>;

export const timeEntrySchema = z.strictObject({
  minutes: z.number().int().min(1).max(1440),
  /** ISO date; empty = today. May go back only as far as the policy's back-dating days. */
  workedOn: z.iso.date().optional(),
});
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;

const optionalBoolean = z.enum(['true', 'false']).transform((v) => v === 'true').optional();

export const tasksQuerySchema = paginationQuerySchema.extend({
  tab: z.enum(TASK_TABS).default('assigned'),
  status: z.enum(TASK_STATUSES).optional(),
  /** Only open tasks (everything but done and rejected); the page opens with this on. */
  openOnly: optionalBoolean,
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.uuid().optional(),
  tagId: z.uuid().optional(),
  stale: optionalBoolean,
  overdue: optionalBoolean,
  /** The archive instead of the live tasks. */
  archived: optionalBoolean,
  groupBy: z.enum(TASK_GROUPINGS).optional(),
  sort: z.enum(TASK_SORT_KEYS).default('dueDate'),
  dir: z.enum(['asc', 'desc']).default('asc'),
});
export type TasksQuery = z.infer<typeof tasksQuerySchema>;

/** The team page: direct reports or everyone below the person in the structure. */
export const teamTasksQuerySchema = tasksQuerySchema.omit({ tab: true }).extend({ reach: z.enum(['direct', 'all']).default('direct') });
export type TeamTasksQuery = z.infer<typeof teamTasksQuerySchema>;

/** The matrix: my own open tasks, or those of the people my matrix key reaches. */
export const taskMatrixQuerySchema = z.strictObject({ scope: z.enum(['mine', 'team']).default('mine') });
export type TaskMatrixQuery = z.infer<typeof taskMatrixQuerySchema>;

export const taskTagInputSchema = z.strictObject({ orgNodeId: z.uuid(), ...localizedNameSchema, isActive: z.boolean().default(true) });
export type TaskTagInput = z.infer<typeof taskTagInputSchema>;

export const taskPolicyInputSchema = z.strictObject({
  objectionWorkingDays: policyNumber('objectionWorkingDays'),
  staleDays: policyNumber('staleDays'),
  backdateDays: policyNumber('backdateDays'),
  urgentDays: policyNumber('urgentDays'),
  reminderDaysBefore: policyNumber('reminderDaysBefore'),
  digestWeekday: policyNumber('digestWeekday'),
  standaloneRetentionDays: policyNumber('standaloneRetentionDays'),
  commentMaxFiles: policyNumber('commentMaxFiles'),
  commentEditMinutes: policyNumber('commentEditMinutes'),
  commentLockDays: policyNumber('commentLockDays'),
});
export type TaskPolicyInput = z.infer<typeof taskPolicyInputSchema>;

// ------------------------------------------------------------------ read models

export interface TaskPersonDto {
  id: string;
  name: string;
}

export interface TaskTagDto {
  id: string;
  orgNodeId: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
}

/** Computed from the data every time; never stored. */
export interface TaskFlagsDto {
  urgent: boolean;
  overdue: boolean;
  stale: boolean;
  objected: boolean;
}

export interface TaskListItemDto {
  id: string;
  number: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  estimateMinutes: number | null;
  assignee: TaskPersonDto;
  creator: TaskPersonDto;
  tag: TaskTagDto | null;
  flags: TaskFlagsDto;
  needsReview: boolean;
  source: TaskSource;
  archivedAt: string | null;
  revision: number;
}

export type TasksPageDto = Paginated<TaskListItemDto> & { groupBy: TaskListGrouping | null };
export type TaskListGrouping = (typeof TASK_GROUPINGS)[number];

export interface TaskEventDto {
  id: string;
  type: TaskEventType;
  actor: TaskPersonDto | null;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  note: string | null;
  createdAt: string;
}

export interface TaskObjectionDto {
  id: string;
  reason: ObjectionReason;
  note: string | null;
  status: ObjectionStatus;
  raisedBy: TaskPersonDto;
  expiresAt: string;
}

/** What the viewer may do with this task right now; the screen shows only these. The API checks again on every request. */
export interface TaskAbilitiesDto {
  moveTo: TaskStatus[];
  edit: boolean;
  approve: boolean;
  object: boolean;
  answerObjection: boolean;
  resubmit: boolean;
  follow: boolean;
  logTime: boolean;
  restore: boolean;
}

export interface TaskDto extends TaskListItemDto {
  description: string;
  /** Somebody marked it urgent by hand (the flag also turns on by itself when the task is due soon or overdue). */
  urgentMarked: boolean;
  reviewer: TaskPersonDto | null;
  approver: TaskPersonDto | null;
  recurrence: TaskRecurrence;
  recurrenceEnd: string | null;
  completedAt: string | null;
  loggedMinutes: number;
  isFollowing: boolean;
  followers: number;
  objection: TaskObjectionDto | null;
  events: TaskEventDto[];
  abilities: TaskAbilitiesDto;
}

/** What the "new task" form shows before saving. */
export interface TaskAssigneeOptionDto {
  id: string;
  name: string;
  /** Who must approve if the task is for oneself (null when nobody has to). */
  isSelf: boolean;
}

export interface TaskFormOptionsDto {
  assignees: TaskAssigneeOptionDto[];
  tags: TaskTagDto[];
  /** The person who approves a task the viewer gives themselves (their direct manager); null = approved at once. */
  approver: TaskPersonDto | null;
}

/** A tag as the tags page shows it: with the department that keeps it. */
export interface TaskTagAdminDto extends TaskTagDto {
  departmentNameAr: string;
  departmentNameEn: string;
}

export interface TaskDepartmentOptionDto {
  id: string;
  /** The unit above, or null at the top of the structure. */
  parentId: string | null;
  nameAr: string;
  nameEn: string;
  pathAr: string;
  pathEn: string;
}

export interface TaskPolicyDto extends TaskPolicyInput {
  companyId: string;
}

/** The numbers on the home page and the lists that open from them. */
export interface TaskSummaryDto {
  open: number;
  overdue: number;
  dueSoon: number;
  doneRecently: number;
  /** Share (0-100) of the tasks finished in the last 30 days that were finished by their due date; null with none finished. */
  onTimeRate: number | null;
  awaitingMyReview: number;
  awaitingMyApproval: number;
  byStatus: Partial<Record<TaskStatus, number>>;
  current: TaskListItemDto[];
  team: { overdue: number; stale: number; doneThisWeek: number } | null;
}

export const MATRIX_QUADRANTS = ['important_urgent', 'important_not_urgent', 'normal_urgent', 'normal_not_urgent'] as const;
export type MatrixQuadrant = (typeof MATRIX_QUADRANTS)[number];

/** Four squares: is the task important (high priority) and is it urgent (due soon, overdue, or marked). */
export interface TaskMatrixDto {
  quadrants: { key: MatrixQuadrant; total: number; items: TaskListItemDto[] }[];
}
