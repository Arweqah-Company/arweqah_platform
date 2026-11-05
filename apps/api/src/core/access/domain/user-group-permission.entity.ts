import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GrantReach } from './grant-reach.entity';

/** A permission placed on a group of people: every member holds it. */
@Entity('user_group_permissions')
export class UserGroupPermission extends GrantReach {
  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @PrimaryColumn({ name: 'permission_key', type: 'varchar', length: 100 })
  key: string;

  @ManyToOne('UserGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'FK_user_group_permissions_group' })
  private readonly groupFk?: unknown;
}
