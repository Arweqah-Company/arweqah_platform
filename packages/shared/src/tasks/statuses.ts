/** The statuses of a task, in the order of the board columns. `rejected` is a task refused at self-approval. */
export const TASK_STATUSES = ['pending_approval', 'todo', 'in_progress', 'awaiting_review', 'done', 'rejected'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_RECURRENCES = ['none', 'daily', 'weekly', 'monthly'] as const;
export type TaskRecurrence = (typeof TASK_RECURRENCES)[number];

/** Where a task comes from. A task with no link is `standalone`; the others wait for their own modules. */
export const TASK_SOURCES = ['standalone', 'project', 'ticket'] as const;
export type TaskSource = (typeof TASK_SOURCES)[number];

/** The four fixed reasons for an objection. */
export const OBJECTION_REASONS = ['not_my_scope', 'not_enough_time', 'missing_information', 'conflicting_priorities'] as const;
export type ObjectionReason = (typeof OBJECTION_REASONS)[number];

export const OBJECTION_STATUSES = ['open', 'expired', 'accepted', 'rejected'] as const;
export type ObjectionStatus = (typeof OBJECTION_STATUSES)[number];

export const TASK_EVENT_TYPES = [
  'created',
  'updated',
  'transitioned',
  'approved',
  'rejected',
  'resubmitted',
  'objected',
  'objection_answered',
  'objection_expired',
  'archived',
  'restored',
  'handed_over',
  'reassigned',
  'time_logged',
] as const;
export type TaskEventType = (typeof TASK_EVENT_TYPES)[number];

/** assigned: given to me; created: I gave it to somebody; following: not mine, but I follow it. */
export const TASK_TABS = ['assigned', 'created', 'following'] as const;
export type TaskTab = (typeof TASK_TABS)[number];

export const TASK_GROUPINGS = ['due', 'status', 'person'] as const;
export type TaskGrouping = (typeof TASK_GROUPINGS)[number];

export const TASK_SORT_KEYS = ['title', 'assignee', 'dueDate', 'priority', 'status', 'tag', 'estimate'] as const;
export type TaskSortKey = (typeof TASK_SORT_KEYS)[number];

/** TSK-000123 */
export const formatTaskNumber = (n: number | string): string => `TSK-${String(n).padStart(6, '0')}`;

export const MAX_TASK_TEXT = 5000;

/** Every number of the task rules lives in the company's policies, inside these limits (so no value can switch tasks off). */
export const TASK_POLICY_LIMITS = {
  objectionWorkingDays: { min: 1, max: 10 },
  staleDays: { min: 7, max: 180 },
  backdateDays: { min: 0, max: 30 },
  urgentDays: { min: 0, max: 14 },
  reminderDaysBefore: { min: 1, max: 7 },
  digestWeekday: { min: 0, max: 6 },
  standaloneRetentionDays: { min: 7, max: 365 },
  commentMaxFiles: { min: 1, max: 10 },
  commentEditMinutes: { min: 0, max: 1440 },
  /** Days after a task closes when its conversation closes too; 0 = never. */
  commentLockDays: { min: 0, max: 365 },
} as const;
export type TaskPolicyKey = keyof typeof TASK_POLICY_LIMITS;

export const TASK_POLICY_DEFAULTS: Record<TaskPolicyKey, number> = {
  objectionWorkingDays: 3,
  staleDays: 30,
  backdateDays: 7,
  urgentDays: 2,
  reminderDaysBefore: 1,
  digestWeekday: 0,
  standaloneRetentionDays: 30,
  commentMaxFiles: 5,
  commentEditMinutes: 15,
  commentLockDays: 0,
};
