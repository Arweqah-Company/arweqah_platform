import { CorePermission } from '@arweqah-platform/shared';
import { ListChecks } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

/** Who may change each detail of an employee (FR-94): an administration page, in platform admin mode. */
export const employeeFieldsFeature: FeatureModule = {
  id: 'employeeFields',
  routes: [{ path: '/employee-fields', lazy: () => import('./employee-fields-page').then((m) => ({ Component: m.EmployeeFieldsPage })) }],
  nav: [{ to: '/employee-fields', labelKey: 'nav.employeeFields', icon: ListChecks, group: 'administration', permission: CorePermission.EmployeeFieldsView, pageKey: 'employee-fields', requiresAdminMode: true }],
  tour: [{ key: 'employee-fields', target: PAGE_TITLE_TARGET, route: '/employee-fields', placement: 'bottom', can: [{ id: 'edit', permission: CorePermission.EmployeeFieldsEdit }, { id: 'export', permission: CorePermission.EmployeeFieldsExport }] }],
  i18n: { ar, en },
};
