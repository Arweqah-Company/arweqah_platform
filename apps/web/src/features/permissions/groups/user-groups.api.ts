import type { UserGroupDto, UserGroupInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refreshAccess } from '@/core/permissions/access-key';
import { apiClient } from '@/core/api/api-client';

const KEY = ['user-groups'];

export const useUserGroups = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<UserGroupDto[]>('/user-groups') });

/** People to add as members: those matching the search (at least two letters). */
export const usePeople = (search: string) =>
  useQuery({
    queryKey: [...KEY, 'people', search],
    enabled: search.trim().length >= 2,
    queryFn: () => apiClient.get<{ id: string; nameAr: string }[]>(`/user-groups/people?q=${encodeURIComponent(search)}`),
  });

export function useSaveUserGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: UserGroupInput }) => (id ? apiClient.put<UserGroupDto>(`/user-groups/${id}`, input) : apiClient.post<UserGroupDto>('/user-groups', input)),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: KEY }), client.invalidateQueries({ queryKey: ['permission-targets', 'list'] }), refreshAccess(client)]),
  });
}

export function useDeleteUserGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/user-groups/${id}`),
    onSuccess: (_, id) => {
      // The deleted group's own permissions are gone: forget them instead of asking again (that would be a 404 with retries).
      client.removeQueries({ queryKey: ['permission-targets', 'one', 'user-group', id] });
      return Promise.all([client.invalidateQueries({ queryKey: KEY }), client.invalidateQueries({ queryKey: ['permission-targets', 'list'] }), refreshAccess(client)]);
    },
  });
}
