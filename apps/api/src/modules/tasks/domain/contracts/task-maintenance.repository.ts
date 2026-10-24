import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { DigestRow, OpenWorkRow, TaskNoticeTarget } from '../types/task.types';

/** The sweeps of the background jobs: what is due for a reminder, overdue, archivable, or left behind by someone who left. */
export abstract class TaskMaintenanceRepository {
  /** Open tasks due within the company's reminder days (today included) that nobody was reminded about yet. */
  abstract dueForReminder(today: string): Promise<TaskNoticeTarget[]>;
  abstract markReminded(ids: string[]): Promise<void>;
  /** Open tasks past their due date whose assignee was not told yet. */
  abstract overdueUnnotified(today: string): Promise<TaskNoticeTarget[]>;
  abstract markOverdueNotified(ids: string[]): Promise<void>;
  /** Overdue open tasks counted per manager of the assignees, for the companies whose digest day is `weekday`. */
  abstract overdueDigest(today: string, weekday: number): Promise<DigestRow[]>;
  /** Archives closed standalone tasks quiet for the company's retention days and returns them. */
  abstract archiveStale(now: Date, tx: TransactionContext): Promise<TaskNoticeTarget[]>;
  /** Whether the estimate notice of a task was already sent; marks it when not (one notice per task). Returns true when this call marked it. */
  abstract claimEstimateNotice(taskId: string, tx: TransactionContext): Promise<boolean>;
  abstract existsOccurrence(parentId: string, dueDate: string, tx: TransactionContext): Promise<boolean>;
  abstract openWorkOf(userId: string): Promise<OpenWorkRow[]>;
  /** The active manager (user) a person reports to, even when the person's own account is already inactive. */
  abstract reportingManagerOf(userId: string): Promise<string | null>;
}
