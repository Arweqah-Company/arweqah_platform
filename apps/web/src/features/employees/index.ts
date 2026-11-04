import { CorePermission } from '@arweqah-platform/shared';
import { Users } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { useJobTitleOptions, useManagerSearch, useOrgNodeOptions } from './api';
export { EmployeeAvatar, employeePhotoUrl } from './employee-avatar';

export const employeesFeature: FeatureModule = {
  id: 'employees',
  routes: [
    { path: '/employees', lazy: () => import('./employees-page').then((m) => ({ Component: m.EmployeesPage })) },
    { path: '/employees/new', lazy: () => import('./employee-form-page').then((m) => ({ Component: m.EmployeeFormPage })) },
    { path: '/employees/:id', lazy: () => import('./employee-details-page').then((m) => ({ Component: m.EmployeeDetailsPage })) },
    { path: '/employees/:id/edit', lazy: () => import('./employee-form-page').then((m) => ({ Component: m.EmployeeFormPage })) },
  ],
  nav: [{ to: '/employees', labelKey: 'nav.employees', icon: Users, group: 'people', permission: CorePermission.EmployeesView, pageKey: 'employees' }],
  tour: [
    { key: 'employees', target: PAGE_TITLE_TARGET, route: '/employees', placement: 'bottom', can: [{ id: 'create', permission: CorePermission.EmployeesCreate }, { id: 'update', permission: CorePermission.EmployeesUpdate }, { id: 'roles', permission: CorePermission.EmployeesAssignRoles }, { id: 'deactivate', permission: CorePermission.EmployeesDeactivate }, { id: 'sensitive', permission: CorePermission.EmployeesViewSensitive }, { id: 'import', permission: CorePermission.EmployeesImport }, { id: 'export', permission: CorePermission.EmployeesExport }, { id: 'impersonate', permission: CorePermission.ImpersonationStart }] },
    { key: 'directory', target: PAGE_TITLE_TARGET, route: '/employees?tab=team', placement: 'bottom', can: [{ id: 'export', permission: CorePermission.DirectoryExport }] },
    { key: 'employee-history', target: PAGE_TITLE_TARGET, route: '/employees', placement: 'bottom' },
    { key: 'bulk-update', target: PAGE_TITLE_TARGET, route: '/employees', placement: 'bottom' },
    { key: 'employee-photo', target: PAGE_TITLE_TARGET, route: '/employees', placement: 'bottom' },
  ],
  i18n: { ar, en },
};
