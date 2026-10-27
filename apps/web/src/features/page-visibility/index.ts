import { CorePermission } from '@arweqah-platform/shared';
import { EyeOff } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const pageVisibilityFeature: FeatureModule = {
  id: 'pageVisibility',
  routes: [{ path: '/page-visibility', lazy: () => import('./page-visibility-page').then((m) => ({ Component: m.PageVisibilityPage })) }],
  nav: [{ to: '/page-visibility', labelKey: 'nav.pageVisibility', icon: EyeOff, group: 'administration', permission: CorePermission.PagesView, requiresAdminMode: true, hideFromMenu: true }],
  i18n: { ar, en },
};
