import { CorePermission } from '@arweqah-platform/shared';
import { Building2 } from 'lucide-react';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const companiesFeature: FeatureModule = {
  id: 'companies',
  routes: [{ path: '/companies', lazy: () => import('./companies-page').then((m) => ({ Component: m.CompaniesPage })) }],
  nav: [{ to: '/companies', labelKey: 'nav.companies', icon: Building2, group: 'people', permission: CorePermission.CompaniesView, requiresAdminMode: true, pageKey: 'companies' }],
  tour: [
    { key: 'companies', target: PAGE_MAIN_TARGET, route: '/companies', placement: 'auto', can: [{ id: 'create', permission: CorePermission.CompaniesCreate }, { id: 'update', permission: CorePermission.CompaniesUpdate }, { id: 'delete', permission: CorePermission.CompaniesDelete }, { id: 'import', permission: CorePermission.CompaniesImport }, { id: 'export', permission: CorePermission.CompaniesExport }] },
  ],
  i18n: { ar, en },
};
