import { Outlet, useMatches } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useServerFailure } from '@/core/api/use-server-failure';
import { useMe } from '@/core/auth/session';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { usePermissions } from '@/core/permissions/can';
import { Alert, ErrorPage } from '@/shared/ui';

/** What a route needs, set in `router.tsx` from its navigation item; the API still enforces everything. */
export interface RouteHandle {
  permission?: string;
  /** An admin page: it shows a notice instead of the page until platform admin mode is on. */
  adminMode?: boolean;
  /** A page an administrator may hide from roles: the 403 page shows while it is hidden from this person. */
  pageKey?: string;
}

/** The page of the current route, the 403 page without its permission, the 500 page when the server failed to give it its data, or a notice while an admin page's mode is off. */
export function RouteOutlet() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { active } = useAdminMode();
  const hidden = useMe().data?.hiddenPages ?? [];
  const serverFailed = useServerFailure();
  const handles = useMatches().map((m) => m.handle as RouteHandle | undefined);
  if (handles.some((h) => (h?.permission && !can(h.permission)) || (h?.pageKey && hidden.some((page) => page === h.pageKey)))) return <ErrorPage code={403} />;
  if (handles.some((h) => h?.adminMode) && !active) return <Alert tone="info">{t('adminMode.needed')}</Alert>;
  if (serverFailed) return <ErrorPage code={500} />;
  return <Outlet />;
}
