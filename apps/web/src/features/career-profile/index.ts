import { CorePermission } from '@arweqah-platform/shared';
import { Award, FileStack, HandCoins, Route, Users } from 'lucide-react';
import { PAGE_TITLE_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { CareerGate } from './career-gate';

/** The career path: the employee's own page (read in order until acknowledged) and, for HR, the content of each title's path. */
export const careerProfileFeature: FeatureModule = {
  id: 'career-profile',
  routes: [
    { path: '/career-profile', lazy: () => import('./my-career-page').then((m) => ({ Component: m.MyCareerPage })) },
    { path: '/career-team', lazy: () => import('./team-page').then((m) => ({ Component: m.CareerTeamPage })) },
    { path: '/career-certificates', lazy: () => import('./certificates-page').then((m) => ({ Component: m.CertificatesPage })) },
    { path: '/career-requests', lazy: () => import('./requests-page').then((m) => ({ Component: m.RequestsPage })) },
    { path: '/career-content', lazy: () => import('./content-page').then((m) => ({ Component: m.CareerContentPage })) },
  ],
  nav: [
    { to: '/career-profile', labelKey: 'nav.careerProfile', icon: Route, group: 'people', permission: CorePermission.CareerProfileView, pageKey: 'career-profile' },
    { to: '/career-team', labelKey: 'nav.careerTeam', icon: Users, group: 'people', permission: CorePermission.CareerTeamView, pageKey: 'career-team' },
    { to: '/career-certificates', labelKey: 'nav.careerCertificates', icon: Award, group: 'people', permission: CorePermission.CareerCertificatesReview, pageKey: 'career-certificates' },
    { to: '/career-requests', labelKey: 'nav.careerRequests', icon: HandCoins, group: 'people', permission: CorePermission.CareerRequestsView, pageKey: 'career-requests' },
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
      key: 'career-team',
      target: PAGE_TITLE_TARGET,
      route: '/career-team',
      placement: 'bottom',
      can: [
        { id: 'decide', permission: CorePermission.CareerTeamDecide },
        { id: 'export', permission: CorePermission.CareerTeamExport },
      ],
    },
    {
      key: 'career-requests',
      target: PAGE_TITLE_TARGET,
      route: '/career-requests',
      placement: 'bottom',
      can: [
        { id: 'approve', permission: CorePermission.CareerRequestsApprove },
        { id: 'reject', permission: CorePermission.CareerRequestsReject },
        { id: 'export', permission: CorePermission.CareerRequestsExport },
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
