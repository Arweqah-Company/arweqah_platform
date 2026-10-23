import type { PermissionScope } from '@arweqah-platform/shared';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/** A permission placed on a group of roles: everyone given the group holds it. */
@Entity('role_group_permissions')
export class RoleGroupPermission {
  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @PrimaryColumn({ name: 'permission_key', type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 20 })
  scope: PermissionScope;

  @ManyToOne('RoleGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'FK_role_group_permissions_group' })
  private readonly groupFk?: unknown;
}
