import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { ReviewerLevel, SaveSelfEvaluationInput, SaveTeamEvaluationInput } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** One employee's evaluation in one cycle (FR-119): the stage they are evaluated by (from their grade and track) and who their direct manager was when the cycle opened. */
@Entity('performance_evaluations')
@Index('UQ_performance_evaluations', ['cycleId', 'employeeId'], { unique: true })
export class PerformanceEvaluation extends BaseEntity {
  @ManyToOne('PerformanceCycle', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cycle_id', foreignKeyConstraintName: 'FK_performance_evaluations_cycle' })
  cycle?: unknown;

  @Column({ name: 'cycle_id', type: 'uuid' })
  cycleId: string;

  @ManyToOne('Employee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_performance_evaluations_employee' })
  employee?: unknown;

  @Index('IDX_performance_evaluations_employee')
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ name: 'stage_no', type: 'int' })
  stageNo: number;

  /** The user of the direct manager when the cycle opened (or when the evaluation was made); null when there was none. */
  @Column({ name: 'manager_user_id', type: 'uuid', nullable: true })
  managerUserId: string | null;
}

/** What the employee wrote about themselves: kept as one document per evaluation. `sent_at` is null until the first send. */
@Entity('performance_self_evaluations')
export class PerformanceSelfEvaluation extends BaseEntity {
  @ManyToOne('PerformanceEvaluation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id', foreignKeyConstraintName: 'FK_performance_self_evaluations_evaluation' })
  evaluation?: unknown;

  @Index('UQ_performance_self_evaluations', { unique: true })
  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId: string;

  @Column({ type: 'jsonb' })
  content: SaveSelfEvaluationInput;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}

/** What a manager wrote about one evaluation, one document per reviewer level (the direct manager, then the upper one): kept apart so what the first entered is never lost. `sent_at` is null while it is a draft. */
@Entity('performance_manager_reviews')
@Index('UQ_performance_manager_reviews', ['evaluationId', 'level'], { unique: true })
export class PerformanceManagerReview extends BaseEntity {
  @ManyToOne('PerformanceEvaluation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id', foreignKeyConstraintName: 'FK_performance_manager_reviews_evaluation' })
  evaluation?: unknown;

  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId: string;

  @Column({ type: 'varchar', length: 8 })
  level: ReviewerLevel;

  @Column({ name: 'reviewer_user_id', type: 'uuid' })
  reviewerUserId: string;

  @Column({ type: 'jsonb' })
  content: SaveTeamEvaluationInput;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;
}

export const PERFORMANCE_EVALUATION_ENTITIES = [PerformanceEvaluation, PerformanceSelfEvaluation, PerformanceManagerReview];
