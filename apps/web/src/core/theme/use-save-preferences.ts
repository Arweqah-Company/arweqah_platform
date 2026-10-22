import type { OwnProfileDto, OwnProfileInput } from '@arweqah-platform/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { ME_KEY } from '../auth/session';

export const PROFILE_KEY = ['profile'];

/** Saves the person's language / theme (and contact details) on their account, so they follow them to every device. */
export function useSavePreferences() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: OwnProfileInput) => apiClient.put<OwnProfileDto>('/me/profile', input),
    onSuccess: (profile) => {
      client.setQueryData(PROFILE_KEY, profile);
      void client.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
