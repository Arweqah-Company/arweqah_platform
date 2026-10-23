import { Outlet, useMatches } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAdminMode } from '@/core/admin-mode/use-admin-mode';
import { usePermissions } from '@/core/permissions/can';
import { Alert, ErrorPage } from '@/shared/ui';

/** What a route needs, set in `router.tsx` from its navigation item; the API still enforces everything. */
export interface RouteHandle {
  permission?: string;
  /** An admin page: it shows a notice instead of the page until platform admin mode is on. */
  adminMode?: boolean;
}

/** The page of the current route, the 403 page without its permission, or a notice while an admin page's mode is off. */
export function RouteOutlet() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { active } = useAdminMode();
  const handles = useMatches().map((m) => m.handle as RouteHandle | undefined);
  if (handles.some((h) => h?.permission && !can(h.permission))) return <ErrorPage code={403} />;
  if (handles.some((h) => h?.adminMode) && !active) return <Alert tone="info">{t('adminMode.needed')}</Alert>;
  return <Outlet />;
}
