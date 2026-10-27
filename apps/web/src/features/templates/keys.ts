import { CorePermission, type ListKey, type TemplateKind } from '@arweqah-platform/shared';

interface KindSettings {
  view: string;
  edit: string;
  reset: string;
  approve: string;
  settings: string;
  exportKey: string;
  /** E-mail only. */
  test?: string;
  listKey: ListKey;
}

/** The permission keys and the list of each tab: e-mail templates and notification templates are separate pages with separate keys. */
export const KIND_KEYS: Record<TemplateKind, KindSettings> = {
  email: {
    view: CorePermission.TemplatesEmailView,
    edit: CorePermission.TemplatesEmailEdit,
    reset: CorePermission.TemplatesEmailReset,
    approve: CorePermission.TemplatesEmailApprove,
    settings: CorePermission.TemplatesEmailSettings,
    exportKey: CorePermission.TemplatesEmailExport,
    test: CorePermission.TemplatesEmailTest,
    listKey: 'email-templates',
  },
  notification: {
    view: CorePermission.TemplatesNotificationView,
    edit: CorePermission.TemplatesNotificationEdit,
    reset: CorePermission.TemplatesNotificationReset,
    approve: CorePermission.TemplatesNotificationApprove,
    settings: CorePermission.TemplatesNotificationSettings,
    exportKey: CorePermission.TemplatesNotificationExport,
    listKey: 'notification-templates',
  },
};
