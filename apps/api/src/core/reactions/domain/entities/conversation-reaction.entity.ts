import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

/**
 * A reaction of one person on one reply of a ticket or one comment of a task. The same table serves both (`targetType` says which), and the
 * key is the person's own slot on the target: one reaction per person, replaced when they choose another.
 */
@Entity('conversation_reactions')
@Index('IDX_conversation_reactions_target', ['targetType', 'targetId'])
export class ConversationReaction {
  /** `ticket_event` or `task_comment`. */
  @PrimaryColumn({ name: 'target_type', type: 'varchar', length: 20 })
  targetType: string;

  @PrimaryColumn({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  /** One of the six keys of `REACTION_KEYS`. */
  @Column({ type: 'varchar', length: 10 })
  reaction: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_conversation_reactions_user' })
  private readonly userFk?: unknown;
}
