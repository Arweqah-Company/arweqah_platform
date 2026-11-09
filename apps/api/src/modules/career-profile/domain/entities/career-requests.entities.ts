import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * A development request (FR-116): learning the employee asks to be paid for. `level` is who decides it now and `approver_user_id` the person who
 * holds that post for this employee when it was routed (a request that went up changes both). The cost is whole riyals; `budget_cap` keeps the yearly
 * cap of the employee's stage on the day it was sent.
 */
@Entity('career_development_requests')
@Index('IDX_career_development_requests_employee', ['employeeId', 'submittedAt'])
@Index('IDX_career_development_requests_approver', ['approverUserId', 'status'])
export class CareerDevelopmentRequest extends BaseEntity {
  @ManyToOne('Employee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_career_development_requests_employee' })
  employee?: unknown;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ name: 'course_name', type: 'varchar', length: 200 })
  courseName: string;

  @Column({ type: 'int' })
  cost: number;

  /** `in` (a unit of the plan, at another provider) or `out` (outside the plan). */
  @Column({ type: 'varchar', length: 3 })
  plan: string;

  @Index('IDX_career_development_requests_status')
  @Column({ type: 'varchar', length: 16 })
  status: string;

  @Column({ type: 'varchar', length: 8 })
  level: string;

  /** Null when nobody holds any post that could decide it. */
  @Column({ name: 'approver_user_id', type: 'uuid', nullable: true })
  approverUserId: string | null;

  @ManyToOne('StoredFile', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agreement_file_id', foreignKeyConstraintName: 'FK_career_development_requests_file' })
  agreementFile?: unknown;

  @Column({ name: 'agreement_file_id', type: 'uuid', nullable: true })
  agreementFileId: string | null;

  @Column({ name: 'budget_cap', type: 'int', nullable: true })
  budgetCap: number | null;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string | null;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;
}

/** The level of one competency an employee reached, recorded by their manager (FR-117). The competency is the one of the title's content, by its name. */
@Entity('career_employee_competency_levels')
@Index('UQ_career_employee_competency_levels', ['employeeId', 'competency'], { unique: true })
export class CareerEmployeeCompetencyLevel extends BaseEntity {
  @ManyToOne('Employee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_career_employee_competency_levels_employee' })
  employee?: unknown;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ type: 'varchar', length: 120 })
  competency: string;

  @Column({ type: 'varchar', length: 40 })
  level: string;

  @Column({ name: 'reached_at', type: 'timestamptz' })
  reachedAt: Date;

  @Column({ name: 'recorded_by', type: 'uuid' })
  recordedBy: string;
}

export const CAREER_REQUEST_ENTITIES = [CareerDevelopmentRequest, CareerEmployeeCompetencyLevel];
