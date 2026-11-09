import { CorePermission } from '@arweqah-platform/shared';
import { BriefcaseBusiness } from 'lucide-react';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { TitleCardDialog } from './title-card-dialog';
export { AddTitlesDialog, DeleteTitleDialog, EditTitleDialog } from './titles-forms';

export const jobTitlesFeature: FeatureModule = {
  id: 'job-titles',
  routes: [{ path: '/job-titles', lazy: () => import('./job-titles-page').then((m) => ({ Component: m.JobTitlesPage })) }],
  nav: [{ to: '/job-titles', labelKey: 'nav.jobTitles', icon: BriefcaseBusiness, group: 'people', permission: CorePermission.JobTitlesView, pageKey: 'job-titles' }],
  tour: [
    { key: 'job-titles', target: PAGE_MAIN_TARGET, route: '/job-titles', placement: 'auto', can: [{ id: 'create', permission: CorePermission.JobTitlesCreate }, { id: 'update', permission: CorePermission.JobTitlesUpdate }, { id: 'delete', permission: CorePermission.JobTitlesDelete }, { id: 'content', permission: CorePermission.OrgTitlesEditContent }, { id: 'import', permission: CorePermission.JobTitlesImport }, { id: 'export', permission: CorePermission.JobTitlesExport }] },
    { key: 'title-card', target: '[data-tour="title-card"]', route: '/job-titles', placement: 'bottom' },
  ],
  i18n: { ar, en },
};
