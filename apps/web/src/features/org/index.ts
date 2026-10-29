import { CorePermission } from '@arweqah-platform/shared';
import { Network } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const orgFeature: FeatureModule = {
  id: 'org',
  routes: [{ path: '/org', lazy: () => import('./org-page').then((m) => ({ Component: m.OrgPage })) }],
  nav: [{ to: '/org', labelKey: 'nav.org', icon: Network, group: 'people', permission: CorePermission.OrgView, pageKey: 'org' }],
  tour: [
    { key: 'org', target: PAGE_TITLE_TARGET, route: '/org', placement: 'bottom', can: [{ id: 'unit_create', permission: CorePermission.OrgUnitCreate }, { id: 'unit_update', permission: CorePermission.OrgUnitUpdate }, { id: 'unit_move', permission: CorePermission.OrgUnitMove }, { id: 'levels', permission: CorePermission.OrgLevelsManage }, { id: 'titles', permission: CorePermission.OrgTitlesManage }, { id: 'export', permission: CorePermission.OrgExport }] },
    { key: 'org-views', target: '[data-tour="view-switch"]', route: '/org', placement: 'bottom' },
    { key: 'org-levels', target: '[data-tour="org-levels"]', route: '/org', placement: 'bottom', can: [{ id: 'titles', permission: CorePermission.OrgTitlesManage }] },
    { key: 'org-add-unit', target: '[data-tour="org-add-unit"]', route: '/org', placement: 'bottom', can: [{ id: 'unit_update', permission: CorePermission.OrgUnitUpdate }, { id: 'unit_move', permission: CorePermission.OrgUnitMove }] },
  ],
  i18n: { ar, en },
};
