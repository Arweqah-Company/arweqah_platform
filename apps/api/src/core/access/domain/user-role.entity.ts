import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

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
}
