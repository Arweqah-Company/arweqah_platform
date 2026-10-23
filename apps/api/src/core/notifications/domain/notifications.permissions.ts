import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'notifications';

export const NOTIFICATIONS_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.NotificationsView, module: MODULE, labelAr: 'عرض صفحة الإشعارات والجرس', labelEn: 'View the notifications page and the bell', scopes: ['all'] },
  { key: CorePermission.NotificationsMarkRead, module: MODULE, labelAr: 'تعليم الإشعارات كمقروءة', labelEn: 'Mark notifications as read', scopes: ['all'] },
  { key: CorePermission.NotificationsExport, module: MODULE, labelAr: 'تصدير الإشعارات', labelEn: 'Export notifications', scopes: ['all'] },
  { key: CorePermission.EmailLogView, module: MODULE, labelAr: 'عرض صفحة سجل البريد المرسل', labelEn: 'View the sent e-mail log page', scopes: ['all'] },
  { key: CorePermission.EmailLogExport, module: MODULE, labelAr: 'تصدير سجل البريد المرسل', labelEn: 'Export the sent e-mail log', scopes: ['all'] },
];
