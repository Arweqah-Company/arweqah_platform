import type { RoleGroupDto, RoleGroupInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = ['role-groups'];

export const useRoleGroups = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<RoleGroupDto[]>('/role-groups') });

export function useSaveRoleGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: RoleGroupInput }) => (id ? apiClient.put<RoleGroupDto>(`/role-groups/${id}`, input) : apiClient.post<RoleGroupDto>('/role-groups', input)),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: KEY }), client.invalidateQueries({ queryKey: ['permission-targets', 'list'] })]),
  });
}

export function useDeleteRoleGroup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/role-groups/${id}`),
    onSuccess: (_, id) => {
      // The deleted group's own permissions are gone: forget them instead of asking again (that would be a 404 with retries).
      client.removeQueries({ queryKey: ['permission-targets', 'one', 'role-group', id] });
      return Promise.all([client.invalidateQueries({ queryKey: KEY }), client.invalidateQueries({ queryKey: ['permission-targets', 'list'] })]);
    },
  });
}
