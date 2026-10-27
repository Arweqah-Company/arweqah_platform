import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'integrations';

export const INTEGRATIONS_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.IntegrationsTranslationView, module: MODULE, labelAr: 'عرض صفحة إعدادات الترجمة', labelEn: 'View the translation settings page', scopes: ['all'] },
  { key: CorePermission.IntegrationsTranslationEdit, module: MODULE, labelAr: 'تعديل بيانات مزودي الترجمة', labelEn: 'Edit translation provider data', scopes: ['all'] },
  { key: CorePermission.IntegrationsTranslationTest, module: MODULE, labelAr: 'تجربة مزود الترجمة', labelEn: 'Try a translation provider', scopes: ['all'] },
  { key: CorePermission.IntegrationsTranslationActivate, module: MODULE, labelAr: 'تفعيل مزود الترجمة وإيقافه', labelEn: 'Activate and switch off a translation provider', scopes: ['all'] },
  { key: CorePermission.IntegrationsTranslationExport, module: MODULE, labelAr: 'تصدير قائمة مزودي الترجمة', labelEn: 'Export the list of translation providers', scopes: ['all'] },
  { key: CorePermission.IntegrationsEmailView, module: MODULE, labelAr: 'عرض صفحة إعدادات البريد الإلكتروني', labelEn: 'View the e-mail settings page', scopes: ['all'] },
  { key: CorePermission.IntegrationsEmailEdit, module: MODULE, labelAr: 'تعديل بيانات مزودي البريد الإلكتروني', labelEn: 'Edit e-mail provider data', scopes: ['all'] },
  { key: CorePermission.IntegrationsEmailTest, module: MODULE, labelAr: 'إرسال بريد تجريبي بمزود البريد', labelEn: 'Send a test e-mail with an e-mail provider', scopes: ['all'] },
  { key: CorePermission.IntegrationsEmailActivate, module: MODULE, labelAr: 'تفعيل مزود البريد الإلكتروني وإيقافه', labelEn: 'Activate and switch off an e-mail provider', scopes: ['all'] },
  { key: CorePermission.IntegrationsEmailExport, module: MODULE, labelAr: 'تصدير قائمة مزودي البريد الإلكتروني', labelEn: 'Export the list of e-mail providers', scopes: ['all'] },
];
