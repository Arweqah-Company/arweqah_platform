import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { BasicRequestInput, BasicRequestStatus } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/**
 * A request to change the basic data of an employee's own record (FR-162): the values asked for (`changes`, only the fields that differ) wait until HR
 * approves them (they are then written to the record) or rejects them. An employee has at most one pending request.
 */
@Entity('employee_basic_requests')
@Index('IDX_employee_basic_requests_employee', ['employeeId', 'submittedAt'])
@Index('UQ_employee_basic_requests_pending', ['employeeId'], { unique: true, where: "status = 'pending'" })
export class EmployeeBasicRequest extends BaseEntity {
  @ManyToOne('Employee', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'FK_employee_basic_requests_employee' })
  employee?: unknown;

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @Column({ type: 'jsonb' })
  changes: BasicRequestInput;

  @Column({ type: 'varchar', length: 16 })
  status: BasicRequestStatus;

  @Column({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string | null;

  /** Optional: what HR wrote when rejecting, sent to the employee. */
  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;
}
