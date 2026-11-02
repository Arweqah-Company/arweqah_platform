import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GrantStamp } from './grant-stamp.entity';

/** One group given to one person. */
@Entity('user_role_groups')
export class UserRoleGroup extends GrantStamp {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index('IDX_user_role_groups_group')
  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_role_groups_user' })
  private readonly userFk?: unknown;

  @ManyToOne('RoleGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'FK_user_role_groups_group' })
  private readonly groupFk?: unknown;

  @ManyToOne('User', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'granted_by', foreignKeyConstraintName: 'FK_user_role_groups_granted_by' })
  private readonly grantedByFk?: unknown;
}
