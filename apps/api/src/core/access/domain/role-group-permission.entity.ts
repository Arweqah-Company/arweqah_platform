import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GrantReach } from './grant-reach.entity';

/** A permission placed on a group of roles: everyone given the group holds it. */
@Entity('role_group_permissions')
export class RoleGroupPermission extends GrantReach {
  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @PrimaryColumn({ name: 'permission_key', type: 'varchar', length: 100 })
  key: string;

  @ManyToOne('RoleGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'FK_role_group_permissions_group' })
  private readonly groupFk?: unknown;
}
