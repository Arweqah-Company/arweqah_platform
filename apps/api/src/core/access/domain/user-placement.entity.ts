import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Where a user sits in the organization. Owned by the access module because
 * permission scopes (team / department / branch) are resolved from it.
 */
@Entity('user_placements')
export class UserPlacement {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index('IDX_user_placements_branch_id')
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId: string | null;

  @Index('IDX_user_placements_department_id')
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Index('IDX_user_placements_team_id')
  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId: string | null;

  @Index('IDX_user_placements_manager_id')
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Constraint-only relations, referenced by entity name to keep modules decoupled.
  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_placements_user' })
  private readonly userFk?: unknown;

  @ManyToOne('Branch')
  @JoinColumn({ name: 'branch_id', foreignKeyConstraintName: 'FK_user_placements_branch' })
  private readonly branchFk?: unknown;

  @ManyToOne('Department')
  @JoinColumn({ name: 'department_id', foreignKeyConstraintName: 'FK_user_placements_department' })
  private readonly departmentFk?: unknown;

  @ManyToOne('Team')
  @JoinColumn({ name: 'team_id', foreignKeyConstraintName: 'FK_user_placements_team' })
  private readonly teamFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id', foreignKeyConstraintName: 'FK_user_placements_manager' })
  private readonly managerFk?: unknown;
}
