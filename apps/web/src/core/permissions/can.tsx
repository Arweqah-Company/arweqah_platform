import type { ReactNode } from 'react';
import { useMe } from '../auth/session';
import { useAccess } from './use-access';

/** UI hint only: the API enforces every permission and scope regardless. */
export function usePermissions() {
  const access = useAccess();
  const keys = new Set((access.data?.grants ?? []).map((g) => g.key));
  return { can: (key: string) => keys.has(key), ready: !!access.data };
}

/** `adminMode`: an administration action of an ordinary page (editing the structure): shown only while platform admin mode is on, like the admin pages. */
export function Can({ permission, adminMode = false, children, fallback = null }: { permission: string; adminMode?: boolean; children: ReactNode; fallback?: ReactNode }) {
  const me = useMe();
  const allowed = usePermissions().can(permission) && (!adminMode || me.data?.adminMode.active === true);
  return <>{allowed ? children : fallback}</>;
}
