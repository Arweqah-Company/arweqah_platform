import type { TransactionContext } from '../../../../common/domain/transaction-context';

export interface CalibrationRow {
  evaluationId: string;
  adjustment: number;
  reason: string | null;
}

export abstract class PerformanceCalibrationRepository {
  /** The adjustments of these evaluations (an evaluation without one has none). */
  abstract forEvaluations(evaluationIds: readonly string[]): Promise<CalibrationRow[]>;
  /** Keeps the adjustment of one evaluation (one row per evaluation; the last write wins). */
  abstract save(row: CalibrationRow & { adjustedBy: string }, tx: TransactionContext): Promise<void>;
  /** Removes the adjustment of one evaluation: an accepted objection starts its score again from the manager's new evaluation. */
  abstract clear(evaluationId: string, tx: TransactionContext): Promise<void>;
}
