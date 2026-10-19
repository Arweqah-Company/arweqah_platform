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

/** Sends the user to sign-in on 401 and to 2FA setup when a role requires it. */
export function SessionWatcher(): null {
  const navigate = useNavigate();
  const client = useQueryClient();
  useEffect(
    () =>
      apiClient.onFailure((error) => {
        if (error.code === 'TWO_FACTOR_REQUIRED') navigate('/security?required=1');
        else if (error.status === 401) {
          client.removeQueries({ queryKey: ME_KEY });
          navigate('/login');
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
  return <>{children}</>;
}

function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
      <span className="size-8 animate-spin rounded-full border-2 border-navy-100 border-t-navy-900" />
    </div>
  );
}
