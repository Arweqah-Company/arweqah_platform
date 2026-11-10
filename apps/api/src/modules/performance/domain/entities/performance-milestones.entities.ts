import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** The minutes of one milestone of the year for one employee in one cycle (FR-121): what the manager recorded, and when the employee read it. */
@Entity('performance_milestones')
@Index('UQ_performance_milestones', ['evaluationId', 'milestoneKey'], { unique: true })
export class PerformanceMilestone extends BaseEntity {
  @ManyToOne('PerformanceEvaluation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id', foreignKeyConstraintName: 'FK_performance_milestones_evaluation' })
  evaluation?: unknown;

  @Column({ name: 'evaluation_id', type: 'uuid' })
  evaluationId: string;

  /** A key of the milestone calendar (`review_jan`, `pulse_mar`…). */
  @Column({ name: 'milestone_key', type: 'varchar', length: 16 })
  milestoneKey: string;

  @Column({ name: 'where_we_are', type: 'text', default: '' })
  whereWeAre: string;

  @Column({ type: 'text', default: '' })
  obstacle: string;

  @Column({ name: 'agreed_action', type: 'text', default: '' })
  agreedAction: string;

  /** The short note of a pulse. */
  @Column({ type: 'text', default: '' })
  note: string;

  @Column({ name: 'recorded_by', type: 'uuid' })
  recordedBy: string;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt: Date | null;
}

export const PERFORMANCE_MILESTONE_ENTITIES = [PerformanceMilestone];
