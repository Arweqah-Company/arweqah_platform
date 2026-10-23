import type { AdminModeDto } from '@arweqah-platform/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { ME_KEY, useMe } from '../auth/session';

const OFF: AdminModeDto = { available: false, active: false, expiresAt: null };

/** Platform admin mode of this session: whether it is offered, whether it is on, and the two ways to change it. */
export function useAdminMode() {
  const client = useQueryClient();
  const state = useMe().data?.adminMode ?? OFF;
  const refresh = () => client.invalidateQueries({ queryKey: ME_KEY });
  const activate = useMutation({ mutationFn: (code: string) => apiClient.post<AdminModeDto>('/admin-mode/activate', { code }), onSuccess: refresh });
  const deactivate = useMutation({ mutationFn: () => apiClient.post<void>('/admin-mode/deactivate'), onSuccess: refresh });
  return { ...state, activate, deactivate, refresh };
}
