import type { PageVisibilityDto, PageVisibilityRoleDto, RolePagesInput } from '@arweqah-platform/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';
import { ME_KEY } from '@/core/auth/session';

const KEY = ['page-visibility'];

export const usePageVisibility = () => useQuery({ queryKey: KEY, queryFn: () => apiClient.get<PageVisibilityDto>('/page-visibility') });

export function useSaveRolePages(roleId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: RolePagesInput) => apiClient.put<PageVisibilityRoleDto>(`/page-visibility/roles/${roleId}`, input),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: KEY }), client.invalidateQueries({ queryKey: ME_KEY })]),
  });
}
