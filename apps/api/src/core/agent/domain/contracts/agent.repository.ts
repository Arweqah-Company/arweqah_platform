import type { AgentLinkDto } from '@arweqah-platform/shared';
import type { AgentConversation, AgentMessage, StoredDraft, StoredDraftResult, StoredForm } from '../entities/agent.entities';

export interface NewAgentMessage {
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  text: string;
  draft?: StoredDraft;
  draftExpiresAt?: Date;
  links?: AgentLinkDto[];
  form?: StoredForm;
}

/** Port: the conversations of the assistant and their drafts. */
export abstract class AgentRepository {
  abstract createConversation(userId: string, title: string): Promise<AgentConversation>;
  /** The conversation only when it belongs to the user. */
  abstract findConversation(id: string, userId: string): Promise<AgentConversation | null>;
  abstract listConversations(userId: string, limit: number): Promise<AgentConversation[]>;
  abstract addMessage(message: NewAgentMessage): Promise<AgentMessage>;
  /** The newest `limit` messages, oldest first. */
  /** The newest `limit` messages, oldest first; with `upTo`, none created after that moment (to the millisecond the database keeps). */
  abstract recentMessages(conversationId: string, limit: number, upTo?: Date): Promise<AgentMessage[]>;
  /** A draft message only when its conversation belongs to the user. */
  abstract findDraftMessage(id: string, userId: string): Promise<AgentMessage | null>;
  /** Any message, only when its conversation belongs to the user. */
  abstract findMessage(id: string, userId: string): Promise<AgentMessage | null>;
  /** Moves a form from one state to another: true for the one caller that found it in `from` (a form is sent once). */
  abstract moveForm(id: string, from: 'open' | 'submitted', to: 'open' | 'submitted'): Promise<boolean>;
  /** Saves a draft message and cancels the conversation's older pending drafts in one transaction under a lock on the conversation. */
  abstract replacePendingDraft(message: NewAgentMessage): Promise<AgentMessage>;
  /** Takes the draft for running: true for the one caller that found it pending and not expired (a second confirm gets false). */
  abstract claimDraft(id: string, now: Date): Promise<boolean>;
  abstract finishDraft(id: string, status: 'confirmed' | 'failed', result: StoredDraftResult): Promise<void>;
  abstract setDraftStatus(id: string, status: 'cancelled' | 'expired'): Promise<void>;
  abstract touchConversation(id: string): Promise<void>;
}
