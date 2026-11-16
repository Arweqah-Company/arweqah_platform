import type { AgentConversationDetailDto, AgentConversationDto, AgentMessageDto, AgentMessageInput, AgentReplyDto, AgentStatusDto } from '@arweqah-platform/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, apiClient } from '@/core/api/api-client';
import i18n from '@/core/i18n';

export interface LiveHandlers {
  onStatus: (status: AgentStatusDto) => void;
  onText: (delta: string) => void;
}

/** Sends a message and listens while the assistant works: what it is doing, the words as they are written, then the final reply (or the error the plain answer would have had). */
export async function sendLive(input: AgentMessageInput, handlers: LiveHandlers): Promise<AgentReplyDto> {
  let reply: AgentReplyDto | null = null;
  let failure: ApiError | null = null;
  await apiClient.postEvents('/agent/messages/stream', input, ({ event, data }) => {
    if (event === 'status') handlers.onStatus(data as AgentStatusDto);
    else if (event === 'text') handlers.onText((data as { delta: string }).delta);
    else if (event === 'reply') reply = data as AgentReplyDto;
    else if (event === 'error') {
      const body = data as { status: number; code: string; message: string };
      failure = new ApiError(body.status, body.code, body.message);
    }
  }, screenLanguage());
  if (failure) throw failure;
  if (!reply) throw new ApiError(0, 'ERROR', 'The assistant did not answer');
  return reply;
}
/** The language of the screen, so the assistant answers its fixed texts in it (the browser's own language can be another). */
const screenLanguage = (): Record<string, string> => ({ 'X-UI-Language': i18n.language === 'en' ? 'en' : 'ar' });

export const useConfirmDraft = () => useMutation({ mutationFn: (id: string) => apiClient.request<AgentReplyDto>(`/agent/drafts/${id}/confirm`, { method: 'POST', headers: screenLanguage() }) });
export const useSubmitForm = () => useMutation({ mutationFn: ({ id, values }: { id: string; values: Record<string, unknown> }) => apiClient.request<AgentReplyDto>(`/agent/forms/${id}/submit`, { method: 'POST', body: { values }, headers: screenLanguage() }) });
export const useCancelDraft = () => useMutation({ mutationFn: (id: string) => apiClient.post<AgentMessageDto>(`/agent/drafts/${id}/cancel`) });

/** The person's earlier conversations; fetched only while the list is open and the person may see their history. */
export const useConversations = (enabled: boolean) => useQuery({ queryKey: ['agent-conversations'], queryFn: () => apiClient.get<AgentConversationDto[]>('/agent/conversations'), enabled });

export const fetchConversation = (id: string) => apiClient.get<AgentConversationDetailDto>(`/agent/conversations/${id}`);
