import { CorePermission } from '@arweqah-platform/shared';
import { KeyRound } from 'lucide-react';
import { redirect } from 'react-router';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { useRoles, usePermissionCatalog } from './api';
export { isDerivedRole } from './role-kind';
export { PermissionMatrix } from './permission-matrix';

export const rolesFeature: FeatureModule = {
  id: 'roles',
  routes: [
    { path: '/roles', lazy: () => import('./roles-page').then((m) => ({ Component: m.RolesPage })) },
    { path: '/exceptions', loader: () => redirect('/roles?tab=exceptions') },
  ],
  nav: [{ to: '/roles', labelKey: 'nav.roles', icon: KeyRound, group: 'administration', permission: CorePermission.RolesView, requiresAdminMode: true, pageKey: 'roles' }],
  tour: [
    { key: 'roles', target: PAGE_MAIN_TARGET, route: '/roles', placement: 'auto', can: [{ id: 'create', permission: CorePermission.RolesCreate }, { id: 'update', permission: CorePermission.RolesUpdate }, { id: 'delete', permission: CorePermission.RolesDelete }, { id: 'export', permission: CorePermission.RolesExport }, { id: 'sync', permission: CorePermission.RolesSyncAuto }] },
  ],
  i18n: { ar, en },
};
