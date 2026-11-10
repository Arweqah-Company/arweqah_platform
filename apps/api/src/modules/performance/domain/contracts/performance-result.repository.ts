import type { PerformanceObjectionStatus, ResultBreakdown } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';

export interface ResultRow {
  evaluationId: string;
  finalScore: number;
  levelName: string | null;
  breakdown: ResultBreakdown;
  approvedBy: string;
  approvedAt: Date;
  notifiedAt: Date | null;
  objectionUntil: string | null;
}

export interface ObjectionRecord {
  id: string;
  evaluationId: string;
  itemKind: string;
  itemRef: string;
  reason: string;
  status: PerformanceObjectionStatus;
  decisionReason: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}

export abstract class PerformanceResultRepository {
  abstract find(evaluationId: string): Promise<ResultRow | null>;
  /** Writes the frozen results of the cycle (one per evaluation; approving twice rewrites the same rows). */
  abstract freeze(rows: readonly ResultRow[], tx: TransactionContext): Promise<void>;
  /** Replaces the score and its breakdown (an accepted objection ended with a new evaluation). */
  abstract replace(evaluationId: string, patch: { finalScore: number; levelName: string | null; breakdown: ResultBreakdown; approvedBy: string; approvedAt: Date }, tx: TransactionContext): Promise<void>;
  /** The evaluation ids of the cycle that have a frozen result. */
  abstract countForCycle(cycleId: string): Promise<number>;
}

export abstract class PerformanceObjectionRepository {
  abstract forEvaluation(evaluationId: string): Promise<ObjectionRecord | null>;
  abstract byId(id: string): Promise<(ObjectionRecord & { cycleId: string; employeeId: string }) | null>;
  abstract forCycle(cycleId: string): Promise<(ObjectionRecord & { employeeId: string })[]>;
  abstract create(row: { evaluationId: string; itemKind: string; itemRef: string; reason: string }, tx: TransactionContext): Promise<void>;
  /** Moves the objection only while it is still at `from` (false when another request decided it first). */
  abstract move(id: string, step: { from: PerformanceObjectionStatus; to: PerformanceObjectionStatus; decidedBy?: string; decisionReason?: string | null; decidedAt?: Date }, tx: TransactionContext): Promise<boolean>;
  /** The manager sent the evaluation again: a returned objection waits for the final approval. */
  abstract markReevaluated(evaluationId: string, tx: TransactionContext): Promise<void>;
  /** How many objections of the cycle are still being decided. */
  abstract pendingCount(cycleId: string): Promise<number>;
}
