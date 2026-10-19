import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from '../../../common/domain/base.entity';

@Entity('branches')
export class Branch extends SoftDeletableEntity {
  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Index({ unique: true, where: 'deleted_at IS NULL' })
  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  city: string | null;
}

@Entity('departments')
export class Department extends SoftDeletableEntity {
  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @Index()
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ name: 'head_user_id', type: 'uuid', nullable: true })
  headUserId: string | null;

  @ManyToOne('Branch')
  @JoinColumn({ name: 'branch_id', foreignKeyConstraintName: 'FK_departments_branch' })
  private readonly branchFk?: unknown;

  @ManyToOne('Department')
  @JoinColumn({ name: 'parent_id', foreignKeyConstraintName: 'FK_departments_parent' })
  private readonly parentFk?: unknown;
}

@Entity('teams')
export class Team extends SoftDeletableEntity {
  @Column({ name: 'name_ar', type: 'varchar', length: 120 })
  nameAr: string;

  @Column({ name: 'name_en', type: 'varchar', length: 120 })
  nameEn: string;

  @Index()
  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @Column({ name: 'lead_user_id', type: 'uuid', nullable: true })
  leadUserId: string | null;

  @ManyToOne('Department')
  @JoinColumn({ name: 'department_id', foreignKeyConstraintName: 'FK_teams_department' })
  private readonly departmentFk?: unknown;
}
