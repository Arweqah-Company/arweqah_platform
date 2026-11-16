import type { AgentConversationDto, AgentDraftDto, AgentDraftStatus, AgentFormDto, AgentFormStatus, AgentMessageDto } from '@arweqah-platform/shared';
import type { AgentConversation, AgentMessage } from '../../domain/entities/agent.entities';

function draftOf(message: AgentMessage): AgentDraftDto | null {
  if (!message.draft || !message.draftStatus || !message.draftExpiresAt) return null;
  return {
    id: message.id,
    operationId: message.draft.operationId,
    labelAr: message.draft.labelAr,
    labelEn: message.draft.labelEn,
    summary: message.draft.summary,
    values: message.draft.values,
    destructive: message.draft.destructive,
    status: message.draftStatus as AgentDraftStatus,
    expiresAt: message.draftExpiresAt.toISOString(),
    result: message.result,
  };
}

function formOf(message: AgentMessage): AgentFormDto | null {
  return message.form && message.formStatus ? { ...message.form, status: message.formStatus as AgentFormStatus } : null;
}

/** The employee never sees the `tool` lines (data the assistant looked up), so they have no DTO. */
export function toMessageDto(message: AgentMessage): AgentMessageDto {
  return { id: message.id, role: message.role === 'user' ? 'user' : 'assistant', text: message.text, draft: draftOf(message), links: message.links, form: formOf(message), createdAt: message.createdAt.toISOString() };
}

export function toConversationDto(conversation: AgentConversation): AgentConversationDto {
  return { id: conversation.id, title: conversation.title, updatedAt: conversation.updatedAt.toISOString() };
}
