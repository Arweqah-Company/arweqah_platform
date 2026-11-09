import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'career-profile';

export const CAREER_PROFILE_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.CareerProfileView, module: MODULE, labelAr: 'عرض مساري الوظيفي', labelEn: 'View my career path', scopes: ['all'] },
  { key: CorePermission.CareerLearningExport, module: MODULE, labelAr: 'تصدير وحدات خطة التعلم في مساري', labelEn: 'Export the learning units of my path', scopes: ['all'] },
  { key: CorePermission.CareerAcknowledgeCreate, module: MODULE, labelAr: 'الإقرار بمساري الوظيفي', labelEn: 'Acknowledge my career path', scopes: ['all'] },
  { key: CorePermission.CareerAcknowledgeReopen, module: MODULE, labelAr: 'إعادة فتح الإقرار بالمسار الوظيفي لشاغلي مسمى', labelEn: 'Reopen the acknowledgement of a career path for a title\'s holders', scopes: ['all'] },
  { key: CorePermission.CareerContentView, module: MODULE, labelAr: 'عرض محتوى المسارات الوظيفية', labelEn: 'View the career-path content', scopes: ['all'] },
  { key: CorePermission.CareerContentEdit, module: MODULE, labelAr: 'تعديل محتوى المسار الوظيفي لمسمى', labelEn: 'Edit the career-path content of a job title', scopes: ['all'] },
  { key: CorePermission.CareerContentImport, module: MODULE, labelAr: 'استيراد روابط وحدات التعلم من ملف', labelEn: 'Import learning-unit links from a file', scopes: ['all'] },
  { key: CorePermission.CareerContentExport, module: MODULE, labelAr: 'تصدير قائمة المسميات وحالة مساراتها', labelEn: 'Export the list of titles and the state of their paths', scopes: ['all'] },
  { key: CorePermission.CareerTitlefileUpload, module: MODULE, labelAr: 'رفع ملف المسمى واستخراج المسار الوظيفي منه', labelEn: 'Upload a title file and read the career path from it', scopes: ['all'] },
  { key: CorePermission.CareerTitlefileAi, module: MODULE, labelAr: 'تحليل ملف المسمى بالذكاء الاصطناعي', labelEn: 'Analyse a title file with AI', scopes: ['all'] },
  { key: CorePermission.CareerTitlefilePublish, module: MODULE, labelAr: 'تعيين المسار الوظيفي جاهزًا أو إرجاعه إلى مسودة', labelEn: 'Set a career path ready or back to draft', scopes: ['all'] },
  { key: CorePermission.CareerTitlefilePreview, module: MODULE, labelAr: 'معاينة المسار الوظيفي كما يراه الموظف', labelEn: 'Preview a career path as the employee sees it', scopes: ['all'] },
  { key: CorePermission.CareerLearningUpload, module: MODULE, labelAr: 'رفع إثبات إنجاز وحدة تعلم', labelEn: 'Send a proof for a learning unit', scopes: ['all'] },
  { key: CorePermission.CareerRequiredTick, module: MODULE, labelAr: 'تعليم بند من المطلوب بأنه تم', labelEn: 'Mark a required item as done', scopes: ['all'] },
  { key: CorePermission.CareerCertificatesReview, module: MODULE, labelAr: 'عرض صفحة مراجعة الشهادات وملفاتها', labelEn: 'View the certificate review page and its files', scopes: ['all'] },
  { key: CorePermission.CareerCertificatesApprove, module: MODULE, labelAr: 'اعتماد إثبات وحدة تعلم', labelEn: 'Approve the proof of a learning unit', scopes: ['all'] },
  { key: CorePermission.CareerCertificatesReject, module: MODULE, labelAr: 'رفض إثبات وحدة تعلم بسبب', labelEn: 'Reject the proof of a learning unit with a reason', scopes: ['all'] },
  { key: CorePermission.CareerCertificatesRefer, module: MODULE, labelAr: 'إحالة إثبات إلى المدير المباشر', labelEn: 'Refer a proof to the direct manager', scopes: ['all'] },
  { key: CorePermission.CareerCertificatesExport, module: MODULE, labelAr: 'تصدير قائمة الشهادات', labelEn: 'Export the list of certificates', scopes: ['all'] },
  { key: CorePermission.CareerTeamView, module: MODULE, labelAr: 'عرض «فريقي المهني»', labelEn: 'View «my career team»', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.CareerTeamDecide, module: MODULE, labelAr: 'البتّ في إثبات أُحيل إلى المدير المباشر', labelEn: 'Decide a proof referred to the direct manager', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.CareerTeamExport, module: MODULE, labelAr: 'تصدير قائمة «فريقي المهني»', labelEn: 'Export the «my career team» list', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.CareerRequestsCreate, module: MODULE, labelAr: 'تقديم طلب تعلّم (طلب تطوير)', labelEn: 'Send a development request', scopes: ['all'] },
  { key: CorePermission.CareerRequestsView, module: MODULE, labelAr: 'عرض صفحة «طلبات التطوير»', labelEn: 'View the «development requests» page', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.CareerRequestsApprove, module: MODULE, labelAr: 'اعتماد طلب تطوير', labelEn: 'Approve a development request', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.CareerRequestsReject, module: MODULE, labelAr: 'رفض طلب تطوير بسبب', labelEn: 'Reject a development request with a reason', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.CareerRequestsExport, module: MODULE, labelAr: 'تصدير قائمة طلبات التطوير', labelEn: 'Export the list of development requests', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.CareerCompetencyRecord, module: MODULE, labelAr: 'تسجيل مستوى جدارة لعضو الفريق', labelEn: 'Record a competency level for a team member', scopes: ['unit', 'subtree', 'company', 'all'] },
];
