import { CorePermission, type OwnProfileDto, type OwnProfileInput } from '@arweqah-platform/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { ME_KEY } from '../auth/session';
import { usePermissions } from '../permissions/can';

export const PROFILE_KEY = ['profile'];

/** Saves the person's language / theme (and contact details) on their account, so they follow them to every device. */
export function useSavePreferences() {
  const client = useQueryClient();
  const canUpdate = usePermissions().can(CorePermission.ProfileUpdate);
  return useMutation({
    // Without the key the choice stays on this device only.
    mutationFn: async (input: OwnProfileInput) => (canUpdate ? apiClient.put<OwnProfileDto>('/me/profile', input) : null),
    onSuccess: (profile) => {
      if (!profile) return;
      client.setQueryData(PROFILE_KEY, profile);
      void client.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
