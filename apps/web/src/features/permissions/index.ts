import { CorePermission } from '@arweqah-platform/shared';
import { ShieldCheck } from 'lucide-react';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const permissionsFeature: FeatureModule = {
  id: 'permissions',
  routes: [{ path: '/permissions', lazy: () => import('./permissions-page').then((m) => ({ Component: m.PermissionsPage })) }],
  nav: [{ to: '/permissions', labelKey: 'nav.permissions', icon: ShieldCheck, group: 'administration', permission: CorePermission.PermissionsView, requiresAdminMode: true, pageKey: 'permissions' }],
  tour: [
    { key: 'permissions', target: PAGE_MAIN_TARGET, route: '/permissions', placement: 'auto', can: [{ id: 'role', permission: CorePermission.PermissionsRoleUpdate }, { id: 'group', permission: CorePermission.PermissionsRoleGroupUpdate }, { id: 'user', permission: CorePermission.PermissionsUserUpdate }, { id: 'usergroup', permission: CorePermission.PermissionsUserGroupUpdate }] },
  ],
  i18n: { ar, en },
};
