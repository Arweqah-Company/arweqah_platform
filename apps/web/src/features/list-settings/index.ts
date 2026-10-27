import { CorePermission } from '@arweqah-platform/shared';
import { Rows3 } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const listSettingsFeature: FeatureModule = {
  id: 'listSettings',
  routes: [{ path: '/list-settings', lazy: () => import('./list-settings-page').then((m) => ({ Component: m.ListSettingsPage })) }],
  nav: [{ to: '/list-settings', labelKey: 'nav.listSettings', icon: Rows3, group: 'administration', permission: CorePermission.ListsView, requiresAdminMode: true, hideFromMenu: true }],
  i18n: { ar, en },
};
