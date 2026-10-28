import type { CommentRulesDto, CommentRulesInput, CreateCommentInput, EditCommentInput, MentionableDto, TaskConversationDto } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = 'task-comments';

/** The conversation of a task. A person who may not read it gets an error (not found), which the screen shows and does not retry. */
export const useConversation = (taskId: string | undefined) =>
  useQuery({ queryKey: [KEY, taskId], enabled: !!taskId, retry: false, queryFn: () => apiClient.get<TaskConversationDto>(`/tasks/${taskId}/comments`) });

/** Every change answers with the whole conversation, which replaces what is cached. */
function useConversationMutation<TIn>(taskId: string, send: (input: TIn) => Promise<TaskConversationDto>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: send, onSuccess: (data) => client.setQueryData([KEY, taskId], data) });
}

export const usePostComment = (taskId: string) =>
  useConversationMutation(taskId, ({ replyTo, ...body }: CreateCommentInput & { replyTo?: string }) =>
    apiClient.post<TaskConversationDto>(replyTo ? `/tasks/${taskId}/comments/${replyTo}/replies` : `/tasks/${taskId}/comments`, body));

export const useEditComment = (taskId: string) =>
  useConversationMutation(taskId, ({ id, ...body }: EditCommentInput & { id: string }) => apiClient.request<TaskConversationDto>(`/tasks/${taskId}/comments/${id}`, { method: 'PATCH', body }));

export const useDeleteComment = (taskId: string) =>
  useConversationMutation(taskId, (id: string) => apiClient.request<TaskConversationDto>(`/tasks/${taskId}/comments/${id}`, { method: 'DELETE' }));

/** The @ list: people matching what was typed after the @ (only while the picker is open). */
export const useMentionables = (taskId: string, search: string, enabled: boolean) =>
  useQuery({ queryKey: [KEY, taskId, 'mentionables', search], enabled, staleTime: 30_000, queryFn: () => apiClient.get<MentionableDto[]>(`/tasks/${taskId}/comments/mentionables`, { search }) });

export const commentFileUrl = (taskId: string, commentId: string, fileId: string): string => `/api/tasks/${taskId}/comments/${commentId}/files/${fileId}`;

// ------------------------------------------------------------------ the matrix (administrator page)

export const useCommentRules = (companyId: string) =>
  useQuery({ queryKey: ['task-comment-rules', companyId], queryFn: () => apiClient.get<CommentRulesDto>('/task-comment-rules', companyId ? { companyId } : undefined) });

export function useSaveCommentRules(companyId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CommentRulesInput) => apiClient.request<CommentRulesDto>(`/task-comment-rules?companyId=${companyId}`, { method: 'PUT', body: input }),
    onSuccess: (data) => client.setQueryData(['task-comment-rules', data.companyId], data),
  });
}
