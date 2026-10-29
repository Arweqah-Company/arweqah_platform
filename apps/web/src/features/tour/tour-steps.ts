import { CorePermission } from '@arweqah-platform/shared';
import { PAGE_TITLE_TARGET, type TourStepUi } from '@/core/feature';

/** The steps that point at the shell (header, account menu, sidebar); the steps of a page are declared by the feature that owns it. */
export const SHELL_STEPS: TourStepUi[] = [
  { key: 'welcome', target: 'body', placement: 'center' },
  { key: 'account-menu', target: '[data-tour="account-menu"]', placement: 'bottom' },
  { key: 'profile', target: '[data-tour="account:/profile"]', placement: 'start', menu: 'account', can: [{ id: 'update', permission: CorePermission.ProfileUpdate }] },
  { key: 'security', target: '[data-tour="account:/security"]', placement: 'start', menu: 'account' },
  { key: 'sign-out', target: '[data-tour="sign-out"]', placement: 'start', menu: 'account' },
  { key: 'language-theme', target: '[data-tour="language-theme"]', placement: 'bottom' },
  { key: 'notifications', target: '[data-tour="notifications"]', placement: 'bottom', can: [{ id: 'mark', permission: CorePermission.NotificationsMarkRead }, { id: 'export', permission: CorePermission.NotificationsExport }] },
  { key: 'sidebar', target: '[data-tour="sidebar"]', placement: 'end', menu: 'drawer' },
  { key: 'finish', target: 'body', placement: 'center' },
  { key: 'admin-mode', target: '[data-tour="admin-mode"]', placement: 'bottom' },
  { key: 'tour-settings', target: PAGE_TITLE_TARGET, route: '/service-settings?tab=tour-settings', placement: 'bottom', can: [{ id: 'edit', permission: CorePermission.TourSettingsEdit }, { id: 'reorder', permission: CorePermission.TourSettingsReorder }, { id: 'reset', permission: CorePermission.TourSettingsReset }, { id: 'export', permission: CorePermission.TourSettingsExport }] },
];
