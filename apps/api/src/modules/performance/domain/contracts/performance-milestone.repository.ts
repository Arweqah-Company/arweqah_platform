import type { RecordMilestoneInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';

export interface MilestoneRow extends RecordMilestoneInput {
  evaluationId: string;
  milestoneKey: string;
  recordedBy: string;
  recordedAt: Date;
  acknowledgedAt: Date | null;
}

export abstract class PerformanceMilestoneRepository {
  abstract forEvaluation(evaluationId: string): Promise<MilestoneRow[]>;
  /** Keeps the minutes; writing them again clears the employee's acknowledgement (they read it anew). */
  abstract save(evaluationId: string, key: string, input: RecordMilestoneInput, recordedBy: string, tx: TransactionContext): Promise<void>;
  /** True when the milestone has minutes to acknowledge. */
  abstract acknowledge(evaluationId: string, key: string, at: Date, tx: TransactionContext): Promise<boolean>;
}
