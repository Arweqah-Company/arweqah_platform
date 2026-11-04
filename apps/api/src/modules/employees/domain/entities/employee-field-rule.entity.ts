import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/** Who may change one detail of an employee: the person themselves, HR, or only a platform administrator (FR-94). One row per field of `EMPLOYEE_FIELDS`. */
@Entity('employee_field_rules')
export class EmployeeFieldRule {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  field: string;

  @Column({ name: 'editable_by_self', type: 'boolean', default: false })
  editableBySelf: boolean;

  @Column({ name: 'editable_by_hr', type: 'boolean', default: true })
  editableByHr: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
