import type { TaskNoticeSettings } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = ['tasks', 'notice-settings'];

/** What I chose for the task summary and reminders (the defaults until I save). */
export const useTaskNoticeSettings = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<TaskNoticeSettings>('/task-notice-settings') });

export function useSaveTaskNoticeSettings() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: TaskNoticeSettings) => apiClient.put<TaskNoticeSettings>('/task-notice-settings', input), onSuccess: (saved) => client.setQueryData(KEY, saved) });
}
