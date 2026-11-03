import type { MeDto } from '@arweqah-platform/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError, apiClient } from '../api/api-client';
import { ACCESS_KEY, refreshAccess } from '../permissions/access-key';
import { useAccess } from '../permissions/use-access';
import { authClient } from './auth-client';

export const ME_KEY = ['me'];

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => apiClient.get<MeDto>('/me'),
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2,
    staleTime: 60_000,
  });
}

export function useSignOut() {
  const client = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await authClient.signOut();
    client.clear();
    navigate('/login', { replace: true });
  };
}

/** A «sign in as» session ran out (idle, or the feature was switched off): go back to the administrator's own account. */
async function endImpersonation(): Promise<void> {
  try {
    await apiClient.post<void>('/impersonation/stop');
  } finally {
    window.location.assign('/');
  }
}

/** Sends the user to sign-in on 401 and to the code step when the session is not code-verified. */
export function SessionWatcher(): null {
  const navigate = useNavigate();
  const client = useQueryClient();
  useEffect(
    () =>
      apiClient.onFailure((error) => {
        if (error.code === 'MFA_REQUIRED') {
          void client.invalidateQueries({ queryKey: ME_KEY });
          navigate('/login/verify');
        }
        else if (error.code === 'IMPERSONATION_ENDED') void endImpersonation();
        else if (error.code === 'ADMIN_MODE_REQUIRED') void Promise.all([client.invalidateQueries({ queryKey: ME_KEY }), refreshAccess(client)]);
        else if (error.status === 401) {
          // Someone who was signed in lost the session: say so (401 page). A visitor without a session just signs in.
          const wasSignedIn = !!client.getQueryData(ME_KEY);
          client.removeQueries({ queryKey: ME_KEY });
          client.removeQueries({ queryKey: ACCESS_KEY });
          navigate(wasSignedIn ? '/401' : '/login');
        }
      }),
    [navigate, client],
  );
  return null;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const access = useAccess();
  const location = useLocation();
  if (me.isPending) return <FullPageSpinner />;
  if (me.isError) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // Every session ends at the code step; someone without an app linked yet enrolls first. A «sign in as» session needs neither: it is the administrator's.
  if (!me.data.authenticatorEnabled && !me.data.impersonation) return <Navigate to="/enroll" replace />;
  if (!me.data.mfaVerified) return <Navigate to="/login/verify" replace state={{ from: location.pathname }} />;
  // The menu and the buttons are built from the permissions: wait for them once, so nothing flashes in or out.
  if (access.isPending) return <FullPageSpinner />;
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
      <span className="size-8 animate-spin rounded-full border-2 border-neutral-200 border-t-petrol-800" />
    </div>
  );
}
