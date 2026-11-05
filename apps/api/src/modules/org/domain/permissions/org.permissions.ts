import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const def = (key: string, labelAr: string, labelEn: string, scopes: PermissionDefinition['scopes'] = ['all']): PermissionDefinition => ({ key, module: 'org', labelAr, labelEn, scopes });
const COMPANY_LEVEL: PermissionDefinition['scopes'] = ['company', 'all'];

export const ORG_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.CompaniesView, 'عرض صفحة الشركات', 'View the companies page'),
  def(CorePermission.CompaniesCreate, 'إضافة شركة', 'Add a company'),
  def(CorePermission.CompaniesUpdate, 'تعديل شركة', 'Edit a company'),
  def(CorePermission.CompaniesDelete, 'حذف شركة', 'Delete a company'),
  def(CorePermission.CompaniesExport, 'تصدير الشركات', 'Export companies'),
  def(CorePermission.CompaniesImport, 'استيراد الشركات من ملف', 'Import companies from a file'),
  def(CorePermission.OrgView, 'عرض الهيكل التنظيمي', 'View the organization structure', ['unit', 'subtree', ...COMPANY_LEVEL]),
  def(CorePermission.OrgUnitCreate, 'إضافة وحدة في الهيكل', 'Add a unit to the structure', COMPANY_LEVEL),
  def(CorePermission.OrgUnitUpdate, 'تعديل وحدة (الاسم والمسؤول وتاريخ البدء)', 'Edit a unit (name, manager, start date)', COMPANY_LEVEL),
  def(CorePermission.OrgUnitMove, 'نقل وحدة إلى مكان آخر', 'Move a unit', COMPANY_LEVEL),
  def(CorePermission.OrgUnitDelete, 'حذف وحدة', 'Delete a unit', COMPANY_LEVEL),
  def(CorePermission.OrgLevelsManage, 'تعديل تقسيمات الهيكل ونسخها', 'Edit and copy the levels of the structure', COMPANY_LEVEL),
  def(CorePermission.OrgTitlesManage, 'إدارة المسميات الوظيفية', 'Manage job titles', COMPANY_LEVEL),
  def(CorePermission.OrgExport, 'تصدير وحدات الهيكل', 'Export units of the structure'),
  def(CorePermission.OrgViewFull, 'رؤية الهيكل كاملًا (حتى الوحدات التي لا موظفين فيها)', 'See the whole structure (even units with no employees)'),
  def(CorePermission.OrgUnitShare, 'تغيير نوع إدارة الوحدة (مشتركة أو لكل شركة)', 'Change how a unit is managed (shared or per company)', COMPANY_LEVEL),
  def(CorePermission.OrgCharterEdit, 'تعديل ميثاق الوحدة', 'Edit the charter of a unit', COMPANY_LEVEL),
  def(CorePermission.OrgLeadersManage, 'تعيين قادة الوحدات والقائمين بالأعمال', 'Assign unit leaders and acting leaders', COMPANY_LEVEL),
  def(CorePermission.OrgTitlesEditContent, 'تعديل محتوى المسمى الوظيفي (المسؤوليات والمؤهلات والمؤشرات)', 'Edit the content of a job title (duties, qualifications, indicators)', COMPANY_LEVEL),
  def(CorePermission.JobTitlesView, 'عرض صفحة المسميات الوظيفية وبطاقاتها', 'View the job titles page and their cards', ['all']),
  def(CorePermission.JobTitlesCreate, 'إضافة مسمى وظيفي', 'Add a job title', COMPANY_LEVEL),
  def(CorePermission.JobTitlesUpdate, 'تعديل مسمى وظيفي', 'Edit a job title', COMPANY_LEVEL),
  def(CorePermission.JobTitlesDelete, 'حذف مسمى وظيفي', 'Delete a job title', COMPANY_LEVEL),
  def(CorePermission.JobTitlesExport, 'تصدير المسميات الوظيفية', 'Export job titles', ['all']),
  def(CorePermission.JobTitlesImport, 'استيراد المسميات الوظيفية من ملف', 'Import job titles from a file', COMPANY_LEVEL),
];
