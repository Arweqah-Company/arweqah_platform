import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'career-profile';

export const CAREER_PROFILE_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.CareerContentView, module: MODULE, labelAr: 'عرض محتوى المسارات الوظيفية', labelEn: 'View the career-path content', scopes: ['all'] },
  { key: CorePermission.CareerContentEdit, module: MODULE, labelAr: 'تعديل محتوى المسار الوظيفي لمسمى', labelEn: 'Edit the career-path content of a job title', scopes: ['all'] },
  { key: CorePermission.CareerTitlefilePublish, module: MODULE, labelAr: 'تعيين المسار الوظيفي جاهزًا أو إرجاعه إلى مسودة', labelEn: 'Set a career path ready or back to draft', scopes: ['all'] },
  { key: CorePermission.CareerTitlefilePreview, module: MODULE, labelAr: 'معاينة المسار الوظيفي كما يراه الموظف', labelEn: 'Preview a career path as the employee sees it', scopes: ['all'] },
];
