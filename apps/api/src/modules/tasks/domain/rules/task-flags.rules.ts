import { daysBetween, type TaskFlagsDto, type TaskStatus } from '@arweqah-platform/shared';

const DAY_MS = 86_400_000;

/** A task is open until it is finished or refused. */
export const isOpenStatus = (status: TaskStatus): boolean => status !== 'done' && status !== 'rejected';

export const isOverdue = (status: TaskStatus, dueDate: string, today: string): boolean => isOpenStatus(status) && dueDate < today;

/** Urgent: marked by hand, overdue, or due within `urgentDays` days. A finished or refused task is never urgent. */
export function isUrgent(task: { status: TaskStatus; dueDate: string; urgentManual: boolean }, today: string, urgentDays: number): boolean {
  if (!isOpenStatus(task.status)) return false;
  return task.urgentManual || isOverdue(task.status, task.dueDate, today) || daysBetween(today, task.dueDate) <= urgentDays;
}

/** Stale: open, and no movement for more than `staleDays` days. A task still waiting for approval is not stale (it waits for somebody else). */
export function isStale(task: { status: TaskStatus; lastActivityAt: Date }, now: Date, staleDays: number): boolean {
  if (!isOpenStatus(task.status) || task.status === 'pending_approval') return false;
  return now.getTime() - task.lastActivityAt.getTime() > staleDays * DAY_MS;
}

export function flagsOf(
  task: { status: TaskStatus; dueDate: string; urgentManual: boolean; lastActivityAt: Date; hasOpenObjection: boolean },
  policy: { urgentDays: number; staleDays: number },
  today: string,
  now: Date,
): TaskFlagsDto {
  return {
    urgent: isUrgent(task, today, policy.urgentDays),
    overdue: isOverdue(task.status, task.dueDate, today),
    stale: isStale(task, now, policy.staleDays),
    objected: task.hasOpenObjection,
  };
}
