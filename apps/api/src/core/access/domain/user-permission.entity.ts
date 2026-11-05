import type { PermissionScope } from '@arweqah-platform/shared';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GrantStamp } from './grant-stamp.entity';

/** A permission given to one person alone (on top of what their roles and groups give). */
@Entity('user_permissions')
export class UserPermission extends GrantStamp {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @PrimaryColumn({ name: 'permission_key', type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 20 })
  scope: PermissionScope;

  /** The fields the grant lets its holder change (`employees.update`); null for permissions that carry no list. */
  @Column({ name: 'fields', type: 'text', array: true, nullable: true })
  fields: string[] | null;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_permissions_user' })
  private readonly userFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'granted_by', foreignKeyConstraintName: 'FK_user_permissions_granted_by' })
  private readonly grantedByFk?: unknown;
}
