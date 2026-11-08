import type { TransactionContext } from '../../../../common/domain/transaction-context';

export interface StoredAcknowledgement {
  contentVersion: number;
  acknowledgedAt: Date;
}

export abstract class CareerAcknowledgementRepository {
  /** The latest acknowledgement of this title by this employee. */
  abstract latest(employeeId: string, titleId: string): Promise<StoredAcknowledgement | null>;
  /** How many acknowledgements the employee has made, of any title (a first sign-in has none). */
  abstract countFor(employeeId: string): Promise<number>;
  /** When HR last asked the holders of this title to acknowledge again. */
  abstract latestReopening(titleId: string): Promise<Date | null>;
  abstract acknowledge(employeeId: string, titleId: string, contentVersion: number, tx: TransactionContext): Promise<void>;
  abstract reopen(titleId: string, reason: string, actorId: string, tx: TransactionContext): Promise<void>;
}
