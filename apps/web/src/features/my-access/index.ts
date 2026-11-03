import { CorePermission } from '@arweqah-platform/shared';
import { KeyRound } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

/** «My access»: what the signed-in person may do and where each permission comes from; read-only, for every employee. */
export const myAccessFeature: FeatureModule = {
  id: 'my-access',
  routes: [{ path: '/my-access', lazy: () => import('./my-access-page').then((m) => ({ Component: m.MyAccessPage })) }],
  nav: [{ to: '/my-access', labelKey: 'nav.myAccess', icon: KeyRound, group: 'account', permission: CorePermission.MyAccessView }],
  i18n: { ar, en },
};
