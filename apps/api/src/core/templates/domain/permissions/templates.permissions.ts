import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'templates';

export const TEMPLATES_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.TemplatesEmailView, module: MODULE, labelAr: 'عرض قوالب البريد الإلكتروني', labelEn: 'View e-mail templates', scopes: ['all'] },
  { key: CorePermission.TemplatesEmailEdit, module: MODULE, labelAr: 'تعديل قوالب البريد الإلكتروني', labelEn: 'Edit e-mail templates', scopes: ['all'] },
  { key: CorePermission.TemplatesEmailReset, module: MODULE, labelAr: 'إعادة قالب بريد إلى صياغته الأصلية', labelEn: 'Reset an e-mail template to its default wording', scopes: ['all'] },
  { key: CorePermission.TemplatesEmailTest, module: MODULE, labelAr: 'إرسال قالب بريد تجريبي إلى نفسك', labelEn: 'Send yourself a test of an e-mail template', scopes: ['all'] },
  { key: CorePermission.TemplatesEmailApprove, module: MODULE, labelAr: 'اعتماد تعديلات قوالب البريد الإلكتروني', labelEn: 'Approve changes to e-mail templates', scopes: ['all'] },
  { key: CorePermission.TemplatesEmailSettings, module: MODULE, labelAr: 'تشغيل اعتماد شخص ثانٍ لقوالب البريد', labelEn: 'Switch second-person approval of e-mail templates on or off', scopes: ['all'] },
  { key: CorePermission.TemplatesEmailExport, module: MODULE, labelAr: 'تصدير قائمة قوالب البريد الإلكتروني', labelEn: 'Export the list of e-mail templates', scopes: ['all'] },
  { key: CorePermission.TemplatesNotificationView, module: MODULE, labelAr: 'عرض قوالب الإشعارات', labelEn: 'View notification templates', scopes: ['all'] },
  { key: CorePermission.TemplatesNotificationEdit, module: MODULE, labelAr: 'تعديل قوالب الإشعارات', labelEn: 'Edit notification templates', scopes: ['all'] },
  { key: CorePermission.TemplatesNotificationReset, module: MODULE, labelAr: 'إعادة قالب إشعار إلى صياغته الأصلية', labelEn: 'Reset a notification template to its default wording', scopes: ['all'] },
  { key: CorePermission.TemplatesNotificationApprove, module: MODULE, labelAr: 'اعتماد تعديلات قوالب الإشعارات', labelEn: 'Approve changes to notification templates', scopes: ['all'] },
  { key: CorePermission.TemplatesNotificationSettings, module: MODULE, labelAr: 'تشغيل اعتماد شخص ثانٍ لقوالب الإشعارات', labelEn: 'Switch second-person approval of notification templates on or off', scopes: ['all'] },
  { key: CorePermission.TemplatesNotificationExport, module: MODULE, labelAr: 'تصدير قائمة قوالب الإشعارات', labelEn: 'Export the list of notification templates', scopes: ['all'] },
];
