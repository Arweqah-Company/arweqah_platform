import { TASK_PRIORITIES, type CreateTaskInput, type TaskPriority, type TaskRecurrence, type TaskDto, type UpdateTaskInput } from '@arweqah-platform/shared';

/** What the form holds while a task is written; text fields stay text until they are sent. */
export interface TaskDraft {
  title: string;
  description: string;
  /** Empty = the person themselves. */
  assigneeUserId: string;
  dueDate: string;
  priority: TaskPriority;
  /** Hours as typed ("1.5"); empty = no estimate. */
  estimateHours: string;
  tagId: string;
  recurrence: TaskRecurrence;
  recurrenceEnd: string;
  urgent: boolean;
  needsReview: boolean;
}

export const PRIORITIES = TASK_PRIORITIES;

export const emptyDraft = (today: string): TaskDraft => ({
  title: '',
  description: '',
  assigneeUserId: '',
  dueDate: today,
  priority: 'medium',
  estimateHours: '',
  tagId: '',
  recurrence: 'none',
  recurrenceEnd: '',
  urgent: false,
  needsReview: false,
});

export const draftOf = (task: TaskDto): TaskDraft => ({
  title: task.title,
  description: task.description,
  assigneeUserId: task.assignee.id,
  dueDate: task.dueDate,
  priority: task.priority,
  estimateHours: task.estimateMinutes === null ? '' : String(Math.round((task.estimateMinutes / 60) * 100) / 100),
  tagId: task.tag?.id ?? '',
  recurrence: task.recurrence,
  recurrenceEnd: task.recurrenceEnd ?? '',
  urgent: task.urgentMarked,
  needsReview: task.needsReview,
});

export const estimateMinutes = (hours: string): number | null => {
  const value = Number(hours);
  return hours.trim() && Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value * 60)) : null;
};

export const toCreateInput = (d: TaskDraft): CreateTaskInput => ({
  title: d.title.trim(),
  description: d.description.trim(),
  assigneeUserId: d.assigneeUserId || undefined,
  dueDate: d.dueDate,
  priority: d.priority,
  estimateMinutes: estimateMinutes(d.estimateHours),
  tagId: d.tagId || null,
  urgent: d.urgent,
  needsReview: d.needsReview,
  recurrence: d.recurrence,
  recurrenceEnd: d.recurrence === 'none' ? null : d.recurrenceEnd || null,
});

export const toUpdateInput = (d: TaskDraft, revision: number): UpdateTaskInput => ({
  title: d.title.trim(),
  description: d.description.trim(),
  dueDate: d.dueDate,
  priority: d.priority,
  estimateMinutes: estimateMinutes(d.estimateHours),
  urgent: d.urgent,
  needsReview: d.needsReview,
  revision,
});

/** Valid when the title is written, the day is set, and a repeat ends after it starts. */
export const isDraftComplete = (d: TaskDraft, today: string, creating: boolean): boolean => {
  if (!d.title.trim() || !d.dueDate) return false;
  if (creating && d.dueDate < today) return false;
  return d.recurrence === 'none' || !d.recurrenceEnd || d.recurrenceEnd >= d.dueDate;
};
