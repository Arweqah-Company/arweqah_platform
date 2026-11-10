import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { ResultBreakdown } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** PostgreSQL returns `numeric` as text; the columns below are plain numbers in the code. */
export const numeric = { to: (v: number | null): number | null => v, from: (v: string | null): number | null => (v === null ? null : Number(v)) };

/** The calibration holder's adjustment of one evaluation (FR-122): a number of half points, with the written reason (kept only while the adjustment is not zero). */
@Entity('performance_calibrations')
export class PerformanceCalibration extends BaseEntity {
  @ManyToOne('PerformanceEvaluation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id', foreignKeyConstraintName: 'FK_performance_calibrations_evaluation' })
  evaluation?: unknown;

  @Index('UQ_performance_calibrations', { unique: true })
  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId: string;

  @Column({ type: 'numeric', precision: 4, scale: 1, default: 0, transformer: numeric })
  adjustment: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'adjusted_by', type: 'uuid' })
  adjustedBy: string;
}

/** The frozen result of one evaluation, written when the approval holder approves (FR-122) and read by the employee after the individual notification (FR-123). */
@Entity('performance_results')
export class PerformanceResult extends BaseEntity {
  @ManyToOne('PerformanceEvaluation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id', foreignKeyConstraintName: 'FK_performance_results_evaluation' })
  evaluation?: unknown;

  @Index('UQ_performance_results', { unique: true })
  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId: string;

  @Column({ name: 'final_score', type: 'numeric', precision: 5, scale: 1, transformer: numeric })
  finalScore: number;

  @Column({ name: 'level_name', type: 'varchar', length: 100, nullable: true })
  levelName: string | null;

  /** The parts of the score, the criteria and behaviours with their scores and the notes, the calibration adjustment and its reason: frozen. */
  @Column({ type: 'jsonb' })
  breakdown: ResultBreakdown;

  @Column({ name: 'approved_by', type: 'uuid' })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamptz' })
  approvedAt: Date;

  /** When the employee was told; the score is hidden from the employee while it is null. */
  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;

  /** The last day an objection may be raised (five working days after the notification). */
  @Column({ name: 'objection_until', type: 'date', nullable: true })
  objectionUntil: string | null;
}

/** The one objection an employee may raise against an item of their result (FR-123). */
@Entity('performance_objections')
export class PerformanceObjection extends BaseEntity {
  @ManyToOne('PerformanceEvaluation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id', foreignKeyConstraintName: 'FK_performance_objections_evaluation' })
  evaluation?: unknown;

  @Index('UQ_performance_objections', { unique: true })
  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId: string;

  /** `criterion`, `behaviour` or `extra`. */
  @Column({ name: 'item_kind', type: 'varchar', length: 16 })
  itemKind: string;

  /** The position of the criterion, the code of the behaviour, or `init` / `growth` / `learning`. */
  @Column({ name: 'item_ref', type: 'varchar', length: 16 })
  itemRef: string;

  @Column({ type: 'text' })
  reason: string;

  /** `open`, `returned` (accepted, the manager re-evaluates), `rejected` or `finalized`. */
  @Column({ type: 'varchar', length: 16, default: 'open' })
  status: string;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decision_reason', type: 'text', nullable: true })
  decisionReason: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;
}

export const PERFORMANCE_RESULT_ENTITIES = [PerformanceCalibration, PerformanceResult, PerformanceObjection];
