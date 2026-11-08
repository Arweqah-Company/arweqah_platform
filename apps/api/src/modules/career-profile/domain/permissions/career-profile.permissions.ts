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
  { key: CorePermission.CareerTitlefilePublish, module: MODULE, labelAr: 'تعيين المسار الوظيفي جاهزًا أو إرجاعه إلى مسودة', labelEn: 'Set a career path ready or back to draft', scopes: ['all'] },
  { key: CorePermission.CareerTitlefilePreview, module: MODULE, labelAr: 'معاينة المسار الوظيفي كما يراه الموظف', labelEn: 'Preview a career path as the employee sees it', scopes: ['all'] },
];
