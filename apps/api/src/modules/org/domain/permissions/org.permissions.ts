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
];
