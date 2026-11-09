import { CorePermission } from '@arweqah-platform/shared';
import { Network } from 'lucide-react';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const orgFeature: FeatureModule = {
  id: 'org',
  routes: [{ path: '/org', lazy: () => import('./org-page').then((m) => ({ Component: m.OrgPage })) }],
  nav: [{ to: '/org', labelKey: 'nav.org', icon: Network, group: 'people', permission: CorePermission.OrgView, pageKey: 'org' }],
  tour: [
    { key: 'org', target: PAGE_MAIN_TARGET, route: '/org', placement: 'auto', can: [{ id: 'unit_create', permission: CorePermission.OrgUnitCreate }, { id: 'unit_update', permission: CorePermission.OrgUnitUpdate }, { id: 'unit_move', permission: CorePermission.OrgUnitMove }, { id: 'unit_share', permission: CorePermission.OrgUnitShare }, { id: 'titles', permission: CorePermission.JobTitlesCreate }, { id: 'export', permission: CorePermission.OrgExport }] },
    { key: 'org-views', target: '[data-tour="view-switch"]', route: '/org', placement: 'bottom' },
    { key: 'org-full-view', target: '[data-tour="org-scope"]', route: '/org', placement: 'bottom' },
    { key: 'org-levels', target: '[data-tour="org-levels"]', route: '/org', placement: 'bottom' },
    { key: 'org-add-unit', target: '[data-tour="org-add-unit"]', route: '/org', placement: 'bottom', can: [{ id: 'unit_update', permission: CorePermission.OrgUnitUpdate }, { id: 'unit_move', permission: CorePermission.OrgUnitMove }] },
    // The Charter tab of the details panel carries this mark; the link opens the first unit on it.
    { key: 'org-charter', target: '[data-tour="org-charter"]', route: '/org?unit=first&tab=charter', placement: 'bottom' },
  ],
  i18n: { ar, en },
};
