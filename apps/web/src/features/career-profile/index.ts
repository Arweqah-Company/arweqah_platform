import { CorePermission } from '@arweqah-platform/shared';
import { Award, FileStack, Route } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { CareerGate } from './career-gate';

/** The career path: the employee's own page (read in order until acknowledged) and, for HR, the content of each title's path. */
export const careerProfileFeature: FeatureModule = {
  id: 'career-profile',
  routes: [
    { path: '/career-profile', lazy: () => import('./my-career-page').then((m) => ({ Component: m.MyCareerPage })) },
    { path: '/career-certificates', lazy: () => import('./certificates-page').then((m) => ({ Component: m.CertificatesPage })) },
    { path: '/career-content', lazy: () => import('./content-page').then((m) => ({ Component: m.CareerContentPage })) },
  ],
  nav: [
    { to: '/career-profile', labelKey: 'nav.careerProfile', icon: Route, group: 'people', permission: CorePermission.CareerProfileView, pageKey: 'career-profile' },
    { to: '/career-certificates', labelKey: 'nav.careerCertificates', icon: Award, group: 'people', permission: CorePermission.CareerCertificatesReview, pageKey: 'career-certificates' },
    { to: '/career-content', labelKey: 'nav.careerContent', icon: FileStack, group: 'people', permission: CorePermission.CareerContentView, pageKey: 'career-content' },
  ],
  tour: [
    { key: 'career-profile', target: PAGE_TITLE_TARGET, route: '/career-profile', placement: 'bottom' },
    {
      key: 'career-content',
      target: PAGE_TITLE_TARGET,
      route: '/career-content',
      placement: 'bottom',
      can: [
        { id: 'upload', permission: CorePermission.CareerTitlefileUpload },
        { id: 'publish', permission: CorePermission.CareerTitlefilePublish },
        { id: 'reopen', permission: CorePermission.CareerAcknowledgeReopen },
        { id: 'import', permission: CorePermission.CareerContentImport },
      ],
    },
    {
      key: 'career-certificates',
      target: PAGE_TITLE_TARGET,
      route: '/career-certificates',
      placement: 'bottom',
      can: [
        { id: 'approve', permission: CorePermission.CareerCertificatesApprove },
        { id: 'reject', permission: CorePermission.CareerCertificatesReject },
        { id: 'refer', permission: CorePermission.CareerCertificatesRefer },
        { id: 'export', permission: CorePermission.CareerCertificatesExport },
      ],
    },
  ],
  i18n: { ar, en },
};
