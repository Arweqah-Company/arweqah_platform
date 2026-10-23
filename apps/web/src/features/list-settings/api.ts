import type { ListSettingDto, ListSettingsInput } from '@arweqah-platform/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';
import { ME_KEY } from '@/core/auth/session';

/** The lists' settings are part of the profile (GET /me), so saving refreshes it. */
export function useSaveListSetting(listKey: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ListSettingsInput) => apiClient.put<ListSettingDto>(`/list-settings/${listKey}`, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ME_KEY }),
  });
}
