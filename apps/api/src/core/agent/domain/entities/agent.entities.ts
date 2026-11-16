import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { AgentFormDto, AgentLinkDto } from '@arweqah-platform/shared';
import { BaseEntity } from '../../../../common/domain/base.entity';

/** One chat of an employee with the platform assistant. Private to its owner. */
@Entity('agent_conversations')
@Index('IDX_agent_conversations_user', ['userId', 'updatedAt'])
export class AgentConversation extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: unknown;

  @Column({ type: 'varchar', length: 120 })
  title: string;
}

/** What the assistant prepared for the employee to confirm: the action and the fields, split by where they travel. */
export interface StoredDraft {
  operationId: string;
  labelAr: string;
  labelEn: string;
  summary: string;
  values: Record<string, unknown>;
  input: { path: Record<string, unknown>; query: Record<string, unknown>; body: Record<string, unknown> };
  destructive: boolean;
}

export interface StoredDraftResult {
  ok: boolean;
  status: number;
  message: string;
}

/** The form the assistant offered: the shared shape without its status (that is `form_status`). */
export type StoredForm = Omit<AgentFormDto, 'status'>;

/** A line of a conversation: what the employee wrote, what the assistant answered (maybe with a draft), or data it looked up (`tool`, never shown). */
@Entity('agent_messages')
@Index('IDX_agent_messages_conversation', ['conversationId', 'createdAt'])
export class AgentMessage extends BaseEntity {
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @ManyToOne(() => AgentConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: AgentConversation;

  /** `user`, `assistant` or `tool` (data the assistant looked up: kept so a later id can be checked against it). */
  @Column({ type: 'varchar', length: 10 })
  role: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', nullable: true })
  draft: StoredDraft | null;

  /** `pending`, `confirmed`, `cancelled`, `expired` or `failed`; null when the message carries no draft. */
  @Column({ name: 'draft_status', type: 'varchar', length: 10, nullable: true })
  draftStatus: string | null;

  @Column({ name: 'draft_expires_at', type: 'timestamptz', nullable: true })
  draftExpiresAt: Date | null;

  @Column({ name: 'executed_at', type: 'timestamptz', nullable: true })
  executedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  result: StoredDraftResult | null;

  /** Links under the message: the manual sections that explain it (checked against what the manual search found). */
  @Column({ type: 'jsonb', nullable: true })
  links: AgentLinkDto[] | null;

  /** The form offered with this message, and whether it was sent (`open` or `submitted`). */
  @Column({ type: 'jsonb', nullable: true })
  form: StoredForm | null;

  @Column({ name: 'form_status', type: 'varchar', length: 10, nullable: true })
  formStatus: string | null;
}
