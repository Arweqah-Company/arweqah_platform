import { Outlet, useMatches } from 'react-router';
import { usePermissions } from '@/core/permissions/can';
import { ErrorPage } from '@/shared/ui';

/** What a route needs, set in `router.tsx` from its navigation item; the API still enforces everything. */
export interface RouteHandle {
  permission?: string;
}

/** The page of the current route, or the 403 page when the person lacks the permission the route needs. */
export function RouteOutlet() {
  const { can } = usePermissions();
  const denied = useMatches().some((m) => (m.handle as RouteHandle | undefined)?.permission && !can((m.handle as RouteHandle).permission as string));
  return denied ? <ErrorPage code={403} /> : <Outlet />;
}
