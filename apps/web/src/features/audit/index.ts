import { CorePermission } from '@arweqah-platform/shared';
import { ScrollText } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const auditFeature: FeatureModule = {
  id: 'audit',
  routes: [{ path: '/audit', lazy: () => import('./audit-page').then((m) => ({ Component: m.AuditPage })) }],
  nav: [{ to: '/audit', labelKey: 'nav.audit', icon: ScrollText, group: 'administration', permission: CorePermission.AuditView, requiresAdminMode: true, pageKey: 'audit' }],
  tour: [
    { key: 'audit', target: PAGE_TITLE_TARGET, route: '/audit', placement: 'bottom', can: [{ id: 'export', permission: CorePermission.AuditExport }] },
  ],
  i18n: { ar, en },
};
