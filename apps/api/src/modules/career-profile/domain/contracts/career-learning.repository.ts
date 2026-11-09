import type { CertificatesQuery } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { LearningRecordRow, QueueRow, RecordDecision, RecordWrite, RequiredTick } from '../types/career-profile.types';

export abstract class CareerLearningRepository {
  /** Every record of an employee, whatever its state. */
  abstract forEmployee(employeeId: string): Promise<LearningRecordRow[]>;
  abstract find(employeeId: string, unitId: string, tx?: TransactionContext): Promise<LearningRecordRow | null>;
  abstract findById(id: string, tx?: TransactionContext): Promise<LearningRecordRow | null>;
  /** Creates the record, or replaces the rejected one of the same employee and unit (the count of rejections stays). */
  abstract submit(write: RecordWrite, tx: TransactionContext): Promise<LearningRecordRow>;
  /** Applies a decision only while the record is still waiting (or with the manager): false when someone decided first. */
  abstract decide(id: string, decision: RecordDecision, tx: TransactionContext): Promise<boolean>;
  /** The review queue: waiting records by default, with the employee and the unit of their title; searched, filtered and paged in the query. */
  abstract queue(query: CertificatesQuery): Promise<{ items: QueueRow[]; total: number }>;
  /** The indexes of the items of «required» the employee marked as done for a title. */
  abstract requiredDone(employeeId: string, titleId: string): Promise<number[]>;
  /** Ticks (or unticks) one item; ticking an item that is ticked changes nothing. */
  abstract setRequired(tick: RequiredTick, tx: TransactionContext): Promise<void>;
}
