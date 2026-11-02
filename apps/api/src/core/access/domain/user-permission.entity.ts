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

  /** The last day it holds (null = no end date); a nightly job takes back what has ended. */
  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt: string | null;

  @Column({ name: 'granted_by', type: 'uuid', nullable: true })
  grantedBy: string | null;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'now()' })
  grantedAt: Date;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'granted_by', foreignKeyConstraintName: 'FK_user_permissions_granted_by' })
  private readonly grantedByFk?: unknown;
}
