import type { MyAccessDto, PermissionScope } from '@arweqah-platform/shared';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiClient } from '../api/api-client';
import { useMe } from '../auth/session';
import { ACCESS_KEY } from './access-key';

/**
 * What the signed-in person may do: read once after the code is verified and kept for the whole session.
 * It is read again only when something that changes it happens (platform admin mode on or off, a role, group or permission edited): see `refreshAccess` in `access-key.ts`.
 */
export function useAccess() {
  const verified = useMe().data?.mfaVerified === true;
  return useQuery({
    queryKey: ACCESS_KEY,
    queryFn: () => apiClient.get<MyAccessDto>('/me/access'),
    enabled: verified,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 2,
  });
}

/** The scope the person holds a permission at (`own`, `unit`, `company`, `all`…), or undefined when they do not hold it. */
export function useReach(key: string): PermissionScope | undefined {
  return useAccess().data?.grants.find((g) => g.key === key)?.scope;
}
