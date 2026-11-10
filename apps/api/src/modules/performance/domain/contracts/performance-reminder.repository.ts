import type { ReminderDto, ReminderInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';

export abstract class PerformanceReminderRepository {
  /** Every reminder, the oldest first. */
  abstract list(): Promise<ReminderDto[]>;
  abstract count(): Promise<number>;
  abstract insert(input: ReminderInput, actorId: string, tx: TransactionContext): Promise<ReminderDto>;
  /** Replaces the fields of a reminder; null when it is not there. */
  abstract update(id: string, input: ReminderInput, actorId: string, tx: TransactionContext): Promise<ReminderDto | null>;
  /** False when it is not there. */
  abstract remove(id: string, tx: TransactionContext): Promise<boolean>;
  /** The day each reminder was last sent (by id); a reminder never sent has no entry. */
  abstract lastSent(): Promise<Map<string, string>>;
  abstract markSent(id: string, day: string): Promise<void>;
}
