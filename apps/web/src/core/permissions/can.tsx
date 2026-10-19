import type { ReactNode } from 'react';
import { useMe } from '../auth/session';

/** UI hint only: the API enforces every permission and scope regardless. */
export function usePermissions() {
  const me = useMe();
  const keys = new Set((me.data?.permissions ?? []).map((p) => p.key));
  return { can: (key: string) => keys.has(key), ready: !!me.data };
}

export function Can({ permission, children, fallback = null }: { permission: string; children: ReactNode; fallback?: ReactNode }) {
  return <>{usePermissions().can(permission) ? children : fallback}</>;
}
