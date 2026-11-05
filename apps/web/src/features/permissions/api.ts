import type { PermissionGrant, PermissionTargetDto, PermissionTargetKind } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refreshAccess } from '@/core/permissions/access-key';
import { apiClient } from '@/core/api/api-client';

export interface TargetOption {
  id: string;
  nameAr: string;
  nameEn: string;
}

const KEY = ['permission-targets'];

/** The roles, groups of roles or groups of people to choose from; for people, the first ones, or those matching the search typed in the drop-down. */
export const useTargetOptions = (kind: PermissionTargetKind, search: string) =>
  useQuery({
    queryKey: [...KEY, 'list', kind, search],
    queryFn: () => apiClient.get<TargetOption[]>(`/permission-targets/${kind}${search ? `?q=${encodeURIComponent(search)}` : ''}`),
  });

export const useTarget = (kind: PermissionTargetKind, id: string) =>
  useQuery({ queryKey: [...KEY, 'one', kind, id], queryFn: () => apiClient.get<PermissionTargetDto>(`/permission-targets/${kind}/${id}`) });

export function useSaveTarget(kind: PermissionTargetKind, id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (permissions: PermissionGrant[]) => apiClient.put<PermissionTargetDto>(`/permission-targets/${kind}/${id}`, { permissions }),
    onSuccess: (target) => {
      client.setQueryData([...KEY, 'one', kind, id], target);
      void refreshAccess(client);
      void client.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}
