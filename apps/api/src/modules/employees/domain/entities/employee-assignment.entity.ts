import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { AssignmentField } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * One period of one placement value of an employee: the unit, the job title or the direct manager (FR-89).
 * A change closes the open period the day before the new one starts; the history is never edited.
 * `employees.org_node_id / job_title_id / manager_id` keep the value in force today (read by scopes, roles and lists);
 * a period that starts later waits here with `applied_at` empty until its day comes.
 */
@Entity('employee_assignments')
@Check('CHK_employee_assignments_period', 'valid_to IS NULL OR valid_to >= valid_from')
@Check(
  'CHK_employee_assignments_value',
  `(field = 'org_node' AND org_node_id IS NOT NULL AND job_title_id IS NULL AND manager_employee_id IS NULL)
   OR (field = 'job_title' AND job_title_id IS NOT NULL AND org_node_id IS NULL AND manager_employee_id IS NULL)
   OR (field = 'manager' AND org_node_id IS NULL AND job_title_id IS NULL)`,
)
@Index('UQ_employee_assignments_open', ['employeeId', 'field'], { unique: true, where: 'valid_to IS NULL' })
@Index('IDX_employee_assignments_period', ['employeeId', 'field', 'validFrom'])
@Index('IDX_employee_assignments_due', ['validFrom'], { where: 'applied_at IS NULL' })
export class EmployeeAssignment extends BaseEntity {
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ type: 'varchar', length: 20 })
  field: AssignmentField;

  @Column({ name: 'org_node_id', type: 'uuid', nullable: true })
  orgNodeId: string | null;

  @Column({ name: 'job_title_id', type: 'uuid', nullable: true })
  jobTitleId: string | null;

  /** The manager is another employee; empty when the period says "no manager". */
  @Column({ name: 'manager_employee_id', type: 'uuid', nullable: true })
  managerEmployeeId: string | null;

  @Column({ name: 'valid_from', type: 'date' })
  validFrom: string;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: string | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  /** When the value was written to the employee record; empty while the period is still in the future. */
  @Column({ name: 'applied_at', type: 'timestamptz', nullable: true })
  appliedAt: Date | null;

  @ManyToOne('Employee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_employee_assignments_employee' })
  employee?: unknown;

  @ManyToOne('OrgNode', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'org_node_id', foreignKeyConstraintName: 'FK_employee_assignments_org_node' })
  orgNode?: unknown;

  @ManyToOne('JobTitle', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'job_title_id', foreignKeyConstraintName: 'FK_employee_assignments_job_title' })
  jobTitle?: unknown;

  @ManyToOne('Employee', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'manager_employee_id', foreignKeyConstraintName: 'FK_employee_assignments_manager' })
  manager?: unknown;
}
