import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'performance';

export const PERFORMANCE_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.PerformanceSelfEvaluate, module: MODULE, labelAr: 'تقييمي الذاتي في دورة التقييم', labelEn: 'My self-evaluation in the evaluation cycle', scopes: ['all'] },
  { key: CorePermission.PerformanceCycleView, module: MODULE, labelAr: 'عرض صفحة «دورة التقييم»', labelEn: 'View the «evaluation cycle» page', scopes: ['all'] },
  { key: CorePermission.PerformanceTemplateAi, module: MODULE, labelAr: 'تحليل ملف التقييم بالذكاء الاصطناعي', labelEn: 'Analyse the evaluation file with AI', scopes: ['all'] },
  { key: CorePermission.PerformanceTemplateUpload, module: MODULE, labelAr: 'رفع ملف التقييم (قوالب المراحل وسلم الدرجات وبطاقة السنة)', labelEn: 'Upload the evaluation file (stage templates, grade scale, fiscal card)', scopes: ['all'] },
  { key: CorePermission.PerformanceCycleManage, module: MODULE, labelAr: 'فتح دورة التقييم ونقلها وتعديل مواعيدها', labelEn: 'Open the evaluation cycle, move it on and change its dates', scopes: ['all'] },
  { key: CorePermission.PerformanceCycleClose, module: MODULE, labelAr: 'إغلاق دورة التقييم', labelEn: 'Close the evaluation cycle', scopes: ['all'] },
  { key: CorePermission.PerformanceCatalogManage, module: MODULE, labelAr: 'إدارة كتالوج المكوّن الإضافي', labelEn: 'Manage the extra-component catalog', scopes: ['all'] },
  { key: CorePermission.PerformanceCatalogExport, module: MODULE, labelAr: 'تصدير كتالوج المكوّن الإضافي', labelEn: 'Export the extra-component catalog', scopes: ['all'] },
  { key: CorePermission.PerformanceRemindersManage, module: MODULE, labelAr: 'إضافة وتعديل وحذف التذكيرات التلقائية لدورة التقييم', labelEn: 'Add, change and remove the automatic reminders of the evaluation cycle', scopes: ['all'] },
  { key: CorePermission.PerformanceRemindersExport, module: MODULE, labelAr: 'تصدير التذكيرات التلقائية لدورة التقييم', labelEn: 'Export the automatic reminders of the evaluation cycle', scopes: ['all'] },
  { key: CorePermission.PerformanceTemplateEdit, module: MODULE, labelAr: 'إضافة وتعديل وحذف أجزاء ملف التقييم (المراحل وسلم الدرجات وبطاقة السنة)', labelEn: 'Add, change and remove the parts of the evaluation file (stages, grade scale, fiscal card)', scopes: ['all'] },
  { key: CorePermission.PerformanceTemplateExport, module: MODULE, labelAr: 'تصدير قائمة ملف التقييم', labelEn: 'Export the list of the evaluation file', scopes: ['all'] },
  { key: CorePermission.PerformanceTeamView, module: MODULE, labelAr: 'عرض صفحة «تقييم فريقي»', labelEn: 'View the «team evaluation» page', scopes: ['subtree', 'all'] },
  { key: CorePermission.PerformanceTeamEvaluate, module: MODULE, labelAr: 'تقييم أعضاء الفريق وإرسال التقييم', labelEn: 'Evaluate team members and send the evaluation', scopes: ['subtree', 'all'] },
  { key: CorePermission.PerformanceTeamExport, module: MODULE, labelAr: 'تصدير قائمة «تقييم فريقي»', labelEn: 'Export the «team evaluation» list', scopes: ['subtree', 'all'] },
  { key: CorePermission.PerformanceCalibrationView, module: MODULE, labelAr: 'عرض صفحة «المعايرة والاعتماد»', labelEn: 'View the «calibration and approval» page', scopes: ['all'] },
  { key: CorePermission.PerformanceCalibrate, module: MODULE, labelAr: 'معايرة درجات الموظفين وإنهاء المعايرة', labelEn: 'Calibrate the scores of employees and finish calibration', scopes: ['all'] },
  { key: CorePermission.PerformanceApprove, module: MODULE, labelAr: 'اعتماد النتائج والبتّ في الاعتراضات', labelEn: 'Approve the results and decide the objections', scopes: ['all'] },
  { key: CorePermission.PerformanceCalibrationExport, module: MODULE, labelAr: 'تصدير قائمة المعايرة والاعتماد', labelEn: 'Export the calibration and approval list', scopes: ['all'] },
  { key: CorePermission.PerformanceObject, module: MODULE, labelAr: 'الاعتراض على نتيجة تقييمي', labelEn: 'Object to the result of my evaluation', scopes: ['all'] },
  { key: CorePermission.PerformanceExport, module: MODULE, labelAr: 'تصدير نسخة من نتيجة تقييمي', labelEn: 'Export a copy of my evaluation result', scopes: ['all'] },
];
