import { CorePermission } from '@arweqah-platform/shared';

/** The permission keys of the tour settings (the tour itself needs none: every employee sees it). */
export const TOUR_KEYS = {
  view: CorePermission.TourSettingsView,
  edit: CorePermission.TourSettingsEdit,
  reorder: CorePermission.TourSettingsReorder,
  reset: CorePermission.TourSettingsReset,
  exportKey: CorePermission.TourSettingsExport,
} as const;
