import type { TaskNoticeSettings } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { TaskSummaryRecipient } from '../types/task.types';

/** What each person chose for the task summary and reminders (FR-215…FR-218). */
export abstract class TaskNoticePreferenceRepository {
  /** The saved settings of one person, or null when they never saved any (the defaults apply). */
  abstract find(userId: string): Promise<TaskNoticeSettings | null>;
  /** The saved settings of several people, by user id; a person without a row is absent. */
  abstract findMany(userIds: string[]): Promise<Map<string, TaskNoticeSettings>>;
  /** Saves the settings; `skipDigestOn` also marks that day's summary as already handled (or null leaves the mark as it is). */
  abstract save(userId: string, settings: TaskNoticeSettings, skipDigestOn: string | null): Promise<void>;
  /** Active people whose summary hour has come (`hour` or earlier today) and who were not handled on `today`, with their open task counts. */
  abstract digestRecipients(hour: number, today: string): Promise<TaskSummaryRecipient[]>;
  abstract markDigestHandled(userId: string, today: string, tx: TransactionContext): Promise<void>;
}
