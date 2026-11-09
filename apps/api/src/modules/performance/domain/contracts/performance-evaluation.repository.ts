import type { SaveSelfEvaluationInput } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';

export interface EvaluationRow {
  id: string;
  cycleId: string;
  employeeId: string;
  stageNo: number;
  managerUserId: string | null;
}

export interface SelfRow {
  content: SaveSelfEvaluationInput;
  sentAt: Date | null;
}

export abstract class PerformanceEvaluationRepository {
  /** Creates the evaluations of a cycle that do not exist yet (one per employee: running it twice adds nothing). */
  abstract createMany(cycleId: string, rows: { employeeId: string; stageNo: number; managerUserId: string | null }[], tx: TransactionContext): Promise<void>;
  abstract find(cycleId: string, employeeId: string): Promise<EvaluationRow | null>;
  abstract self(evaluationId: string): Promise<SelfRow | null>;
  /** Keeps the document; the first send sets `sentAt`, a later save keeps it. */
  abstract saveSelf(evaluationId: string, content: SaveSelfEvaluationInput, sentAt: Date | null, tx: TransactionContext): Promise<void>;
}
