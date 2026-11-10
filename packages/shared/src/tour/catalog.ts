import { CorePermission } from '../permissions/keys';
import type { HideablePage } from '../pages/schemas';

/** The two tours: the general one every employee sees once, and the administration one an administrator sees on first switching admin mode on. */
export const TOUR_IDS = ['general', 'admin'] as const;
export type TourId = (typeof TOUR_IDS)[number];

export interface TourStepDef {
  key: string;
  tour: TourId;
  /** Shown only to people who hold this key. */
  permission?: string;
  /** … and whose roles do not hide this page. */
  page?: HideablePage;
}

/**
 * Every step of every tour, in its default order. Pages with no link in the side menu (page visibility, list management) have no step.
 * The code owns the steps (what is highlighted is declared by the web feature
 * that owns the page, `FeatureModule.tour`); an administrator edits the wording, switches a step off and reorders them.
 * A new page adds its row here, its `data-tour` target, and its `tour.<key>.{title,body}` texts in Arabic and English.
 */
export const TOUR_STEPS = [
  { key: 'welcome', tour: 'general' },
  { key: 'account-menu', tour: 'general' },
  { key: 'profile', tour: 'general' },
  { key: 'security', tour: 'general' },
  { key: 'my-access', tour: 'general', permission: CorePermission.MyAccessView },
  { key: 'sign-out', tour: 'general' },
  { key: 'language-theme', tour: 'general' },
  { key: 'notifications', tour: 'general' },
  { key: 'sidebar', tour: 'general' },
  { key: 'home', tour: 'general' },
  { key: 'tickets', tour: 'general', permission: CorePermission.TicketsView, page: 'tickets' },
  { key: 'ticket-new', tour: 'general', permission: CorePermission.TicketsCreate, page: 'tickets' },
  { key: 'ticket-views', tour: 'general', permission: CorePermission.TicketsView, page: 'tickets' },
  { key: 'tasks', tour: 'general', permission: CorePermission.TasksView, page: 'tasks' },
  { key: 'task-new', tour: 'general', permission: CorePermission.TasksCreate, page: 'tasks' },
  { key: 'task-views', tour: 'general', permission: CorePermission.TasksView, page: 'tasks' },
  { key: 'task-open', tour: 'general', permission: CorePermission.TasksView, page: 'tasks' },
  { key: 'employees', tour: 'general', permission: CorePermission.EmployeesView, page: 'employees' },
  { key: 'employee-history', tour: 'general', permission: CorePermission.EmployeesHistoryView, page: 'employees' },
  { key: 'bulk-update', tour: 'general', permission: CorePermission.EmployeesBulkUpdate, page: 'employees' },
  { key: 'employee-photo', tour: 'general', permission: CorePermission.EmployeesPhotoUpdate, page: 'employees' },
  { key: 'directory', tour: 'general', permission: CorePermission.DirectoryView, page: 'directory' },
  { key: 'org', tour: 'general', permission: CorePermission.OrgView, page: 'org' },
  { key: 'org-views', tour: 'general', permission: CorePermission.OrgView, page: 'org' },
  { key: 'org-full-view', tour: 'general', permission: CorePermission.OrgViewFull, page: 'org' },
  { key: 'job-titles', tour: 'general', permission: CorePermission.JobTitlesView, page: 'job-titles' },
  { key: 'title-card', tour: 'general', permission: CorePermission.JobTitlesView, page: 'job-titles' },
  { key: 'career-profile', tour: 'general', permission: CorePermission.CareerProfileView, page: 'career-profile' },
  { key: 'career-content', tour: 'general', permission: CorePermission.CareerContentView, page: 'career-content' },
  { key: 'career-certificates', tour: 'general', permission: CorePermission.CareerCertificatesReview, page: 'career-certificates' },
  { key: 'career-requests', tour: 'general', permission: CorePermission.CareerRequestsView, page: 'career-requests' },
  { key: 'performance-team', tour: 'general', permission: CorePermission.PerformanceTeamView, page: 'performance-team' },
  { key: 'performance-calibration', tour: 'general', permission: CorePermission.PerformanceCalibrationView, page: 'performance-calibration' },
  { key: 'performance-cycle', tour: 'general', permission: CorePermission.PerformanceCycleView, page: 'performance-cycle' },
  { key: 'career-team', tour: 'general', permission: CorePermission.CareerTeamView, page: 'career-team' },
  { key: 'finish', tour: 'general' },
  { key: 'admin-mode', tour: 'admin', permission: CorePermission.AdminModeUse },
  { key: 'companies', tour: 'admin', permission: CorePermission.CompaniesView, page: 'companies' },
  { key: 'org-levels', tour: 'admin', permission: CorePermission.OrgLevelsManage, page: 'org' },
  { key: 'org-add-unit', tour: 'admin', permission: CorePermission.OrgUnitCreate, page: 'org' },
  { key: 'org-charter', tour: 'admin', permission: CorePermission.OrgCharterEdit, page: 'org' },
  { key: 'roles', tour: 'admin', permission: CorePermission.RolesView, page: 'roles' },
  { key: 'exceptions', tour: 'admin', permission: CorePermission.ExceptionsView, page: 'exceptions' },
  { key: 'permissions', tour: 'admin', permission: CorePermission.PermissionsView, page: 'permissions' },
  { key: 'audit', tour: 'admin', permission: CorePermission.AuditView, page: 'audit' },
  { key: 'email-log', tour: 'admin', permission: CorePermission.EmailLogView, page: 'email-log' },
  { key: 'settings', tour: 'admin', permission: CorePermission.IntegrationsEmailView, page: 'email-settings' },
  { key: 'captcha-settings', tour: 'admin', permission: CorePermission.IntegrationsCaptchaView, page: 'captcha-settings' },
  { key: 'ai-settings', tour: 'admin', permission: CorePermission.IntegrationsAiView, page: 'ai-settings' },
  { key: 'tour-settings', tour: 'admin', permission: CorePermission.TourSettingsView, page: 'tour-settings' },
] as const satisfies readonly TourStepDef[];

export type TourStepKey = (typeof TOUR_STEPS)[number]['key'];
export const TOUR_STEP_KEYS = TOUR_STEPS.map((s) => s.key) as [TourStepKey, ...TourStepKey[]];

export function stepsOf(tour: TourId): readonly TourStepDef[] {
  return TOUR_STEPS.filter((s) => s.tour === tour);
}

export function tourStepDef(key: string): TourStepDef | undefined {
  return TOUR_STEPS.find((s) => s.key === key);
}
