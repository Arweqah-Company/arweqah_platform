import { CorePermission } from '@arweqah-platform/shared';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/api-client';
import { useMe } from '../auth/session';
import { usePermissions } from '../permissions/can';

/** Everything the page was showing belonged to another person, so after switching the whole app starts again from home. */
const restart = (): void => window.location.assign('/');

/** «Sign in as»: whether this session is one, whether the button may show, and the two ways to switch. */
export function useImpersonation() {
  const me = useMe().data;
  const { can } = usePermissions();
  const start = useMutation({ mutationFn: (userId: string) => apiClient.post<void>(`/impersonation/${userId}`), onSuccess: restart });
  const stop = useMutation({ mutationFn: () => apiClient.post<void>('/impersonation/stop'), onSuccess: restart });
  return {
    current: me?.impersonation ?? null,
    start,
    stop,
    /** The button shows for a platform administrator in admin mode, while the feature is on, for someone else's active account. */
    canStartFor: (userId: string, isActive: boolean): boolean =>
      !!me && !me.impersonation && me.impersonationEnabled && me.adminMode.active && can(CorePermission.ImpersonationStart) && isActive && userId !== me.id,
  };
}
