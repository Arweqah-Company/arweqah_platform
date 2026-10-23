import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/** One person in one group of people. */
@Entity('user_group_members')
export class UserGroupMember {
  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @Index('IDX_user_group_members_user')
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne('UserGroup', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id', foreignKeyConstraintName: 'FK_user_group_members_group' })
  private readonly groupFk?: unknown;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_group_members_user' })
  private readonly userFk?: unknown;
}
