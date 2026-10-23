import { CorePermission } from '@arweqah-platform/shared';
import { KeyRound } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { useRoles } from './api';

export const rolesFeature: FeatureModule = {
  id: 'roles',
  routes: [{ path: '/roles', lazy: () => import('./roles-page').then((m) => ({ Component: m.RolesPage })) }],
  nav: [{ to: '/roles', labelKey: 'nav.roles', icon: KeyRound, group: 'administration', permission: CorePermission.RolesView, requiresAdminMode: true }],
  i18n: { ar, en },
};
