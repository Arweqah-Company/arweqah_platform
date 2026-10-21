import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = ['notifications'];

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
