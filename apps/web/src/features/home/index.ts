import { CorePermission } from '@arweqah-platform/shared';
import { House } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import { HomePage } from './home-page';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export const homeFeature: FeatureModule = {
  id: 'home',
  routes: [{ index: true, Component: HomePage }],
  nav: [{ to: '/', labelKey: 'nav.home', icon: House, rank: 0 }],
  tour: [
    { key: 'home', target: PAGE_TITLE_TARGET, route: '/', placement: 'bottom', can: [{ id: 'tasks', permission: CorePermission.TasksView }, { id: 'tickets', permission: CorePermission.TicketsView }, { id: 'matrix', permission: CorePermission.TasksMatrixView }, { id: 'employees', permission: CorePermission.EmployeesView }, { id: 'audit', permission: CorePermission.AuditView }] },
  ],
  i18n: { ar, en },
};
