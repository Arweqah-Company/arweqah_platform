import { CorePermission } from '@arweqah-platform/shared';
import { UserRound } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const profileFeature: FeatureModule = {
  id: 'profile',
  routes: [{ path: '/profile', lazy: () => import('./profile-page').then((m) => ({ Component: m.ProfilePage })) }],
  nav: [{ to: '/profile', labelKey: 'nav.profile', icon: UserRound, group: 'account', permission: CorePermission.ProfileView }],
  i18n: { ar, en },
};
