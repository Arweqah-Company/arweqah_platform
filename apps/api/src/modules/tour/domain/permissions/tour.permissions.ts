import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'tour';

export const TOUR_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.TourSettingsView, module: MODULE, labelAr: 'عرض إعدادات جولة الترحيب', labelEn: 'View the welcome tour settings', scopes: ['all'] },
  { key: CorePermission.TourSettingsEdit, module: MODULE, labelAr: 'تعديل نص خطوة في جولة الترحيب وتفعيلها أو إيقافها', labelEn: 'Edit a welcome-tour step and switch it on or off', scopes: ['all'] },
  { key: CorePermission.TourSettingsReorder, module: MODULE, labelAr: 'إعادة ترتيب خطوات جولة الترحيب', labelEn: 'Reorder the welcome-tour steps', scopes: ['all'] },
  { key: CorePermission.TourSettingsReset, module: MODULE, labelAr: 'إعادة خطوة في جولة الترحيب إلى نصّها الأصلي', labelEn: 'Reset a welcome-tour step to its default wording', scopes: ['all'] },
  { key: CorePermission.TourSettingsExport, module: MODULE, labelAr: 'تصدير قائمة خطوات جولة الترحيب', labelEn: 'Export the list of welcome-tour steps', scopes: ['all'] },
];
