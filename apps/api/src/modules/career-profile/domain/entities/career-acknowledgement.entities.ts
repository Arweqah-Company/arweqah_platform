import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** An employee's acknowledgement of the career path of a title, at the content version they read (FR-112). */
@Entity('career_acknowledgements')
@Index('UQ_career_acknowledgements', ['employeeId', 'titleId', 'contentVersion'], { unique: true })
export class CareerAcknowledgement extends BaseEntity {
  @ManyToOne('Employee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_career_acknowledgements_employee' })
  employee?: unknown;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ManyToOne('JobTitle', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'title_id', foreignKeyConstraintName: 'FK_career_acknowledgements_title' })
  title?: unknown;

  @Column({ name: 'title_id', type: 'uuid' })
  titleId: string;

  @Column({ name: 'content_version', type: 'int' })
  contentVersion: number;

  @Column({ name: 'acknowledged_at', type: 'timestamptz' })
  acknowledgedAt: Date;
}

/** HR asked the holders of a title to acknowledge again: whoever acknowledged before `createdAt` is asked once more (FR-112). */
@Entity('career_ack_reopenings')
export class CareerAckReopening extends BaseEntity {
  @ManyToOne('JobTitle', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'title_id', foreignKeyConstraintName: 'FK_career_ack_reopenings_title' })
  title?: unknown;

  @Index('IDX_career_ack_reopenings_title')
  @Column({ name: 'title_id', type: 'uuid' })
  titleId: string;

  @Column({ type: 'varchar', length: 300 })
  reason: string;

  @Column({ name: 'reopened_by', type: 'uuid', nullable: true })
  reopenedBy: string | null;
}

export const CAREER_ACKNOWLEDGEMENT_ENTITIES = [CareerAcknowledgement, CareerAckReopening];
