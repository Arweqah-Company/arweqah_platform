import type { Paginated, TaskGrouping } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { NewObjection, NewTask, NewTaskEvent, TaskEventRow, TaskListFilters, TaskObjectionRow, TaskPatch, TaskRow } from '../types/task.types';

/** Everything the services need from the stored tasks, so they never touch the database directly. */
export abstract class TaskRepository {
  abstract insert(task: NewTask, tx: TransactionContext): Promise<string>;
  /** The task with names and counts as seen by `viewerUserId` (for "is following"). */
  abstract find(id: string, viewerUserId: string, tx?: TransactionContext): Promise<TaskRow | null>;
  /** Changes columns when the revision is still `expectedRevision`; false means somebody else changed it first. */
  abstract patch(id: string, expectedRevision: number, patch: TaskPatch, tx: TransactionContext): Promise<boolean>;
  abstract list(filters: TaskListFilters): Promise<Paginated<TaskRow> & { groupBy: TaskGrouping | null }>;
  /** Open tasks of a scope without paging (for the matrix), at most `limit`. */
  abstract listOpen(filters: Omit<TaskListFilters, 'page' | 'pageSize'>, limit: number): Promise<TaskRow[]>;

  abstract appendEvent(event: NewTaskEvent, tx: TransactionContext): Promise<void>;
  abstract events(taskId: string): Promise<TaskEventRow[]>;

  abstract follow(taskId: string, userId: string, tx?: TransactionContext): Promise<void>;
  abstract unfollow(taskId: string, userId: string, tx?: TransactionContext): Promise<void>;
  abstract followerIds(taskId: string): Promise<string[]>;

  abstract addTime(entry: { taskId: string; userId: string; minutes: number; workedOn: string }, tx: TransactionContext): Promise<void>;
  abstract loggedMinutes(taskId: string, tx?: TransactionContext): Promise<number>;

  abstract openObjection(taskId: string, tx?: TransactionContext): Promise<TaskObjectionRow | null>;
  abstract insertObjection(objection: NewObjection, tx: TransactionContext): Promise<string>;
  abstract answerObjection(id: string, status: 'accepted' | 'rejected' | 'expired', answeredBy: string | null, tx: TransactionContext): Promise<boolean>;
}
