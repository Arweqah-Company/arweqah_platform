import type { ReviewerLevel, SaveSelfEvaluationInput, SaveTeamEvaluationInput } from '@arweqah-platform/shared';
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

export interface ReviewRow {
  evaluationId: string;
  level: ReviewerLevel;
  reviewerUserId: string;
  content: SaveTeamEvaluationInput;
  sentAt: Date | null;
}

export abstract class PerformanceEvaluationRepository {
  /** Creates the evaluations of a cycle that do not exist yet (one per employee: running it twice adds nothing). */
  abstract createMany(cycleId: string, rows: { employeeId: string; stageNo: number; managerUserId: string | null }[], tx: TransactionContext): Promise<void>;
  abstract find(cycleId: string, employeeId: string): Promise<EvaluationRow | null>;
  abstract self(evaluationId: string): Promise<SelfRow | null>;
  /** Keeps the document; the first send sets `sentAt`, a later save keeps it. */
  abstract saveSelf(evaluationId: string, content: SaveSelfEvaluationInput, sentAt: Date | null, tx: TransactionContext): Promise<void>;
  /** The evaluations of these employees in the cycle. */
  abstract forEmployees(cycleId: string, employeeIds: readonly string[]): Promise<EvaluationRow[]>;
  /** The ids of the evaluations whose self-evaluation was sent. */
  abstract selfSentIds(evaluationIds: readonly string[]): Promise<Set<string>>;
  /** The managers' documents of these evaluations (both levels). */
  abstract reviews(evaluationIds: readonly string[]): Promise<ReviewRow[]>;
  /** Keeps one level's document; a draft has no `sentAt`. */
  abstract saveReview(row: ReviewRow, tx: TransactionContext): Promise<void>;
  /** The direct manager has begun this evaluation (a draft or a send): the employee can no longer change their self-evaluation. */
  abstract directStarted(evaluationId: string): Promise<boolean>;
}
