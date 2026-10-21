import type { MeDto } from '@arweqah-platform/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError, apiClient } from '../api/api-client';
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
        else if (error.status === 401) {
          // Someone who was signed in lost the session: say so (401 page). A visitor without a session just signs in.
          const wasSignedIn = !!client.getQueryData(ME_KEY);
          client.removeQueries({ queryKey: ME_KEY });
          navigate(wasSignedIn ? '/401' : '/login');
        }
      }),
    [navigate, client],
  );
  return null;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return <FullPageSpinner />;
  if (me.isError) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  // Every session ends at the code step; someone without an app linked yet enrolls first.
  if (!me.data.authenticatorEnabled) return <Navigate to="/enroll" replace />;
  if (!me.data.mfaVerified) return <Navigate to="/login/verify" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
      <span className="size-8 animate-spin rounded-full border-2 border-neutral-200 border-t-petrol-800" />
    </div>
  );
}
