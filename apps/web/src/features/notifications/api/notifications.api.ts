import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

import type { NotificationDto } from '@arweqah-platform/shared';

const KEY = ['notifications'];
export const LATEST = 5;

export function useUnreadCount() {
  return useQuery({
    queryKey: [...KEY, 'unread'],
    queryFn: () => apiClient.get<{ count: number }>('/notifications/unread-count'),
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | 'all') =>
      ids === 'all' ? apiClient.post('/notifications/read-all') : apiClient.post('/notifications/read', { ids }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** The newest few, for the bell's drop-down; fetched only while it is open. */
export function useLatestNotifications(enabled: boolean) {
  return useQuery({
    queryKey: [...KEY, 'latest'],
    queryFn: () => apiClient.get<{ items: NotificationDto[] }>('/notifications', { pageSize: LATEST }),
    enabled,
  });
}
