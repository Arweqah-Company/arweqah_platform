import { CorePermission } from '@arweqah-platform/shared';
import { Users } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const usersFeature: FeatureModule = {
  id: 'users',
  routes: [{ path: '/users', lazy: () => import('./users-page').then((m) => ({ Component: m.UsersPage })) }],
  nav: [{ to: '/users', labelKey: 'nav.users', icon: Users, permission: CorePermission.UsersView }],
  i18n: { ar, en },
};
