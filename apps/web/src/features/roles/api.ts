import type { PermissionCatalogGroup, RoleDto, RoleSyncResultDto, UpsertRoleInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refreshAccess } from '@/core/permissions/access-key';
import { apiClient } from '@/core/api/api-client';

const KEY = ['roles'];

/** `enabled` is false where the person may not choose roles, so the list is not asked for. */
export const useRoles = (enabled = true) => useQuery({ queryKey: KEY, enabled, queryFn: () => apiClient.get<RoleDto[]>('/roles') });

export const usePermissionCatalog = () =>
  useQuery({ queryKey: ['permission-catalog'], queryFn: () => apiClient.get<PermissionCatalogGroup[]>('/permissions/catalog'), staleTime: Infinity });

export function useSaveRole() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: UpsertRoleInput }) =>
      id ? apiClient.put<RoleDto>(`/roles/${id}`, input) : apiClient.post<RoleDto>('/roles', input),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: KEY }), refreshAccess(client)]),
  });
}

export function useDeleteRole() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => apiClient.delete(`/roles/${id}`), onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: KEY }), refreshAccess(client)]) });
}

export function useSyncAutoRoles() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<RoleSyncResultDto>('/roles/sync-auto', {}),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: KEY }), refreshAccess(client)]),
  });
}
