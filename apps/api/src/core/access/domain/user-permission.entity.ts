import type { PermissionScope } from '@arweqah-platform/shared';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/** A permission given to one person alone (on top of what their roles and groups give). */
@Entity('user_permissions')
export class UserPermission {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'permission_key', type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 20 })
  scope: PermissionScope;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_permissions_user' })
  private readonly userFk?: unknown;
}
