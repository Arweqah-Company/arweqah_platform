import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'performance';

export const PERFORMANCE_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.PerformanceCycleView, module: MODULE, labelAr: 'عرض صفحة «دورة التقييم»', labelEn: 'View the «evaluation cycle» page', scopes: ['all'] },
  { key: CorePermission.PerformanceTemplateUpload, module: MODULE, labelAr: 'رفع ملف التقييم (قوالب المراحل وسلم الدرجات وبطاقة السنة)', labelEn: 'Upload the evaluation file (stage templates, grade scale, fiscal card)', scopes: ['all'] },
  { key: CorePermission.PerformanceCycleManage, module: MODULE, labelAr: 'فتح دورة التقييم ونقلها وتعديل مواعيدها', labelEn: 'Open the evaluation cycle, move it on and change its dates', scopes: ['all'] },
  { key: CorePermission.PerformanceCycleClose, module: MODULE, labelAr: 'إغلاق دورة التقييم', labelEn: 'Close the evaluation cycle', scopes: ['all'] },
  { key: CorePermission.PerformanceCatalogManage, module: MODULE, labelAr: 'إدارة كتالوج المكوّن الإضافي', labelEn: 'Manage the extra-component catalog', scopes: ['all'] },
  { key: CorePermission.PerformanceCatalogExport, module: MODULE, labelAr: 'تصدير كتالوج المكوّن الإضافي', labelEn: 'Export the extra-component catalog', scopes: ['all'] },
];
