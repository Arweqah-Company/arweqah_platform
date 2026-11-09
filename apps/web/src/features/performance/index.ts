import { CorePermission } from '@arweqah-platform/shared';
import { ClipboardCheck } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

/** Performance evaluation: the cycle for HR now (stepper, evaluation file, dates, catalog); the employee's and the manager's screens come with the next stages. */
export const performanceFeature: FeatureModule = {
  id: 'performance',
  routes: [{ path: '/performance-cycle', lazy: () => import('./cycle-page').then((m) => ({ Component: m.CyclePage })) }],
  nav: [{ to: '/performance-cycle', labelKey: 'nav.performanceCycle', icon: ClipboardCheck, group: 'people', permission: CorePermission.PerformanceCycleView, pageKey: 'performance-cycle' }],
  tour: [
    {
      key: 'performance-cycle',
      target: PAGE_TITLE_TARGET,
      route: '/performance-cycle',
      placement: 'bottom',
      can: [
        { id: 'manage', permission: CorePermission.PerformanceCycleManage },
        { id: 'close', permission: CorePermission.PerformanceCycleClose },
        { id: 'upload', permission: CorePermission.PerformanceTemplateUpload },
        { id: 'catalog', permission: CorePermission.PerformanceCatalogManage },
      ],
    },
  ],
  i18n: { ar, en },
};
