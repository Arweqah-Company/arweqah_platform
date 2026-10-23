import { CorePermission } from '@arweqah-platform/shared';
import { Network } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const orgFeature: FeatureModule = {
  id: 'org',
  routes: [{ path: '/org', lazy: () => import('./org-page').then((m) => ({ Component: m.OrgPage })) }],
  nav: [{ to: '/org', labelKey: 'nav.org', icon: Network, group: 'people', permission: CorePermission.OrgView, pageKey: 'org' }],
  i18n: { ar, en },
};
