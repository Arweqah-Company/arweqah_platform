import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

@Entity('user_roles')
export class UserRole {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index('IDX_user_roles_role')
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string;

  // Constraint-only relations (by entity name, so access does not import the users module).
  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_roles_user' })
  private readonly userFk?: unknown;

  @ManyToOne('Role', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'FK_user_roles_role' })
  private readonly roleFk?: unknown;

  /** The last day it holds (null = no end date); a nightly job takes back what has ended. */
  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt: string | null;

  @Column({ name: 'granted_by', type: 'uuid', nullable: true })
  grantedBy: string | null;

  @Column({ name: 'granted_at', type: 'timestamptz', default: () => 'now()' })
  grantedAt: Date;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'granted_by', foreignKeyConstraintName: 'FK_user_roles_granted_by' })
  private readonly grantedByFk?: unknown;
}
