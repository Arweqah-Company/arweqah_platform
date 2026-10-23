import { CorePermission } from '@arweqah-platform/shared';
import { Users } from 'lucide-react';
import type { FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { useManagerSearch } from './api';

export const employeesFeature: FeatureModule = {
  id: 'employees',
  routes: [
    { path: '/employees', lazy: () => import('./employees-page').then((m) => ({ Component: m.EmployeesPage })) },
    { path: '/employees/new', lazy: () => import('./employee-form-page').then((m) => ({ Component: m.EmployeeFormPage })) },
    { path: '/employees/:id', lazy: () => import('./employee-details-page').then((m) => ({ Component: m.EmployeeDetailsPage })) },
    { path: '/employees/:id/edit', lazy: () => import('./employee-form-page').then((m) => ({ Component: m.EmployeeFormPage })) },
  ],
  nav: [{ to: '/employees', labelKey: 'nav.employees', icon: Users, group: 'people', permission: CorePermission.EmployeesView, pageKey: 'employees' }],
  i18n: { ar, en },
};
