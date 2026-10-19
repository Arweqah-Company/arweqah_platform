import type { PermissionCatalogGroup, RoleDto, UpsertRoleInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';

const KEY = ['roles'];

export const useRoles = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<RoleDto[]>('/roles') });

export const usePermissionCatalog = () =>
  useQuery({ queryKey: ['permission-catalog'], queryFn: () => apiClient.get<PermissionCatalogGroup[]>('/permissions/catalog'), staleTime: Infinity });

export function useSaveRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: UpsertRoleInput }) =>
      id ? apiClient.put<RoleDto>(`/roles/${id}`, input) : apiClient.post<RoleDto>('/roles', input),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteRole() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiClient.delete(`/roles/${id}`), onSuccess: () => client.invalidateQueries({ queryKey: KEY }) });
}
