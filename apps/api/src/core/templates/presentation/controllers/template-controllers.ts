import { CorePermission } from '@arweqah-platform/shared';
import { templateApprovalController, templatesController } from './templates.controller';

export const EmailTemplatesController = templatesController('email', 'email-templates', {
  view: CorePermission.TemplatesEmailView,
  edit: CorePermission.TemplatesEmailEdit,
  reset: CorePermission.TemplatesEmailReset,
  approve: CorePermission.TemplatesEmailApprove,
  settings: CorePermission.TemplatesEmailSettings,
});

export const NotificationTemplatesController = templatesController('notification', 'notification-templates', {
  view: CorePermission.TemplatesNotificationView,
  edit: CorePermission.TemplatesNotificationEdit,
  reset: CorePermission.TemplatesNotificationReset,
  approve: CorePermission.TemplatesNotificationApprove,
  settings: CorePermission.TemplatesNotificationSettings,
});

export const EmailTemplateApprovalController = templateApprovalController('email', 'email-templates', CorePermission.TemplatesEmailApprove);
export const NotificationTemplateApprovalController = templateApprovalController('notification', 'notification-templates', CorePermission.TemplatesNotificationApprove);
