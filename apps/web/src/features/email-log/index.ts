import { CorePermission } from '@arweqah-platform/shared';
import { MailCheck } from 'lucide-react';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const emailLogFeature: FeatureModule = {
  id: 'emailLog',
  routes: [{ path: '/email-log', lazy: () => import('./email-log-page').then((m) => ({ Component: m.EmailLogPage })) }],
  nav: [{ to: '/email-log', labelKey: 'nav.emailLog', icon: MailCheck, group: 'administration', permission: CorePermission.EmailLogView, requiresAdminMode: true, pageKey: 'email-log' }],
  tour: [
    { key: 'email-log', target: PAGE_MAIN_TARGET, route: '/email-log', placement: 'auto', can: [{ id: 'export', permission: CorePermission.EmailLogExport }] },
  ],
  i18n: { ar, en },
};
