import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'access';
const def = (key: string, labelAr: string, labelEn: string): PermissionDefinition => ({ key, module: MODULE, labelAr, labelEn, scopes: ['all'] });

export const ACCESS_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.RolesView, 'عرض صفحة الأدوار والصلاحيات', 'View the roles and permissions page'),
  def(CorePermission.RolesCreate, 'إضافة دور', 'Add a role'),
  def(CorePermission.RolesUpdate, 'تعديل دور وصلاحياته', 'Edit a role and its permissions'),
  def(CorePermission.RolesDelete, 'حذف دور', 'Delete a role'),
  def(CorePermission.RolesExport, 'تصدير الأدوار', 'Export roles'),
  def(CorePermission.AdminModeUse, 'استخدام وضع مدير المنصة', 'Use platform admin mode'),
  def(CorePermission.PagesView, 'عرض صفحة ظهور الصفحات', 'View the page visibility page'),
  def(CorePermission.PagesManage, 'إخفاء الصفحات وإظهارها لكل دور', 'Hide and show pages for each role'),
  def(CorePermission.ProfileView, 'عرض الملف الشخصي', 'View my profile'),
  def(CorePermission.ProfileUpdate, 'تعديل بياناتي الشخصية والتفضيلات', 'Edit my contact details and preferences'),
  def(CorePermission.SecurityView, 'عرض صفحة الأمان', 'View the security page'),
];
