import type { PermissionScope } from '@arweqah-platform/shared';
import type { TaskViewer } from '../types/task.types';

export interface MyTaskCounts {
  open: number;
  overdue: number;
  dueSoon: number;
  doneRecently: number;
  doneOnTime: number;
}

export interface TeamTaskCounts {
  overdue: number;
  stale: number;
  doneThisWeek: number;
}

/** Counts for the home page, computed by the database (nothing is loaded just to be counted). */
export abstract class TaskSummaryRepository {
  /** The person's own tasks: open, overdue, due within `soonDays`, and finished in the last 30 days (how many, how many on time). */
  abstract mine(userId: string, today: string, now: Date, soonDays: number): Promise<MyTaskCounts>;
  /** The person's open tasks per status. */
  abstract byStatus(userId: string): Promise<Record<string, number>>;
  /** Tasks waiting for the person: as reviewer, and as the named approver. */
  abstract waiting(userId: string): Promise<{ review: number; approval: number }>;
  /** The tasks of the people the scope reaches (never the person's own). */
  abstract team(viewer: TaskViewer, scope: PermissionScope, input: { today: string; now: Date; staleDays: number }): Promise<TeamTaskCounts>;
}
