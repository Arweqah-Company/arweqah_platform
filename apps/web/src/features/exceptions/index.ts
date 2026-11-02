import { CorePermission } from '@arweqah-platform/shared';
import { CalendarClock } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const exceptionsFeature: FeatureModule = {
  id: 'exceptions',
  routes: [{ path: '/exceptions', lazy: () => import('./exceptions-page').then((m) => ({ Component: m.ExceptionsPage })) }],
  nav: [{ to: '/exceptions', labelKey: 'nav.exceptions', icon: CalendarClock, group: 'administration', permission: CorePermission.ExceptionsView, requiresAdminMode: true, pageKey: 'exceptions' }],
  tour: [
    { key: 'exceptions', target: PAGE_TITLE_TARGET, route: '/exceptions', placement: 'bottom', can: [{ id: 'update', permission: CorePermission.ExceptionsUpdate }, { id: 'revoke', permission: CorePermission.ExceptionsRevoke }, { id: 'export', permission: CorePermission.ExceptionsExport }] },
  ],
  i18n: { ar, en },
};
