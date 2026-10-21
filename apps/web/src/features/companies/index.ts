import { CorePermission } from '@arweqah-platform/shared';
import { Building2 } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const companiesFeature: FeatureModule = {
  id: 'companies',
  routes: [{ path: '/companies', lazy: () => import('./companies-page').then((m) => ({ Component: m.CompaniesPage })) }],
  nav: [{ to: '/companies', labelKey: 'nav.companies', icon: Building2, group: 'people', permission: CorePermission.CompaniesView }],
  i18n: { ar, en },
};
