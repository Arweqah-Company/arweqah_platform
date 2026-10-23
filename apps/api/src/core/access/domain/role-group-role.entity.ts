import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/** One role inside one group. */
@Entity('role_group_roles')
export class RoleGroupRole {
  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Index('IDX_role_group_roles_role')
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @ManyToOne('RoleGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'FK_role_group_roles_group' })
  private readonly groupFk?: unknown;

  @ManyToOne('Role', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'FK_role_group_roles_role' })
  private readonly roleFk?: unknown;
}
