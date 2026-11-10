import { CorePermission } from '@arweqah-platform/shared';
import { ClipboardCheck, ClipboardList, Scale } from 'lucide-react';
import { PAGE_MAIN_TARGET, type FeatureModule } from '@/core/feature';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { EvaluationSection } from './evaluation-section';
export { EvaluationNoticeBanner } from './notice-banner';

/** Performance evaluation: the cycle for HR (stepper, evaluation file, dates, catalog), the employee's self-evaluation and the manager's team evaluation; calibration, approval and objections for the holder, and «my result» with the objection for the employee. */
export const performanceFeature: FeatureModule = {
  id: 'performance',
  routes: [
    { path: '/performance-cycle', lazy: () => import('./cycle-page').then((m) => ({ Component: m.CyclePage })) },
    { path: '/performance-calibration', lazy: () => import('./calibration-page').then((m) => ({ Component: m.CalibrationPage })) },
    { path: '/performance-team', lazy: () => import('./team-page').then((m) => ({ Component: m.TeamEvaluationPage })) },
  ],
  nav: [
    { to: '/performance-team', labelKey: 'nav.performanceTeam', icon: ClipboardList, group: 'career', permission: CorePermission.PerformanceTeamView, pageKey: 'performance-team' },
    { to: '/performance-calibration', labelKey: 'nav.performanceCalibration', icon: Scale, group: 'career', permission: CorePermission.PerformanceCalibrationView, pageKey: 'performance-calibration' },
    { to: '/performance-cycle', labelKey: 'nav.performanceCycle', icon: ClipboardCheck, group: 'career', permission: CorePermission.PerformanceCycleView, pageKey: 'performance-cycle' },
  ],
  tour: [
    {
      key: 'performance-team',
      target: PAGE_MAIN_TARGET,
      route: '/performance-team',
      placement: 'auto',
      can: [
        { id: 'evaluate', permission: CorePermission.PerformanceTeamEvaluate },
        { id: 'export', permission: CorePermission.PerformanceTeamExport },
      ],
    },
    {
      key: 'performance-calibration',
      target: PAGE_MAIN_TARGET,
      route: '/performance-calibration',
      placement: 'auto',
      can: [
        { id: 'calibrate', permission: CorePermission.PerformanceCalibrate },
        { id: 'approve', permission: CorePermission.PerformanceApprove },
        { id: 'export', permission: CorePermission.PerformanceCalibrationExport },
      ],
    },
    {
      key: 'performance-cycle',
      target: PAGE_MAIN_TARGET,
      route: '/performance-cycle',
      placement: 'auto',
      can: [
        { id: 'manage', permission: CorePermission.PerformanceCycleManage },
        { id: 'close', permission: CorePermission.PerformanceCycleClose },
        { id: 'upload', permission: CorePermission.PerformanceTemplateUpload },
        { id: 'catalog', permission: CorePermission.PerformanceCatalogManage },
        { id: 'reminders', permission: CorePermission.PerformanceRemindersManage },
        { id: 'templates', permission: CorePermission.PerformanceTemplateEdit },
        { id: 'ai', permission: CorePermission.PerformanceTemplateAi },
      ],
    },
  ],
  i18n: { ar, en },
};
