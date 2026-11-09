import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * The state of one learning unit for one employee: the proof they sent, and what the review decided (FR-114). The unit is the one of the
 * title's content document (`unit_id` is its id); no record means «not started». One record per employee and unit: a rejected proof is replaced
 * by the next one and the count of rejections stays.
 */
@Entity('career_learning_records')
@Index('UQ_career_learning_records', ['employeeId', 'unitId'], { unique: true })
export class CareerLearningRecord extends BaseEntity {
  @ManyToOne('Employee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_career_learning_records_employee' })
  employee?: unknown;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne('JobTitle', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'title_id', foreignKeyConstraintName: 'FK_career_learning_records_title' })
  title?: unknown;

  /** The title the employee held when they sent the proof. */
  @Column({ name: 'title_id', type: 'uuid' })
  titleId: string;

  @Column({ name: 'unit_id', type: 'uuid' })
  unitId: string;

  /** `wait` (sent), `referred` (with the direct manager), `done` (approved: its hours count), `rej` (rejected, with a reason). */
  @Index('IDX_career_learning_records_status')
  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ name: 'proof_kind', type: 'varchar', length: 16 })
  proofKind: string;

  @ManyToOne('StoredFile', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'file_id', foreignKeyConstraintName: 'FK_career_learning_records_file' })
  file?: unknown;

  @Column({ name: 'file_id', type: 'uuid', nullable: true })
  fileId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  /** The unit's duration when the proof was sent: what approving it adds to the employee's hours. */
  @Column({ type: 'int' })
  minutes: number;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'rejection_count', type: 'int', default: 0 })
  rejectionCount: number;
}

/** An employee marked an item of «required» as done (the check box of the item). */
@Entity('career_required_progress')
@Index('UQ_career_required_progress', ['employeeId', 'titleId', 'itemIndex'], { unique: true })
export class CareerRequiredProgress extends BaseEntity {
  @ManyToOne('Employee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_career_required_progress_employee' })
  employee?: unknown;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne('JobTitle', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'title_id', foreignKeyConstraintName: 'FK_career_required_progress_title' })
  title?: unknown;

  @Column({ name: 'title_id', type: 'uuid' })
  titleId: string;

  @Column({ name: 'item_index', type: 'int' })
  itemIndex: number;

  @Column({ name: 'done_at', type: 'timestamptz' })
  doneAt: Date;
}

export const CAREER_PROGRESS_ENTITIES = [CareerLearningRecord, CareerRequiredProgress];
