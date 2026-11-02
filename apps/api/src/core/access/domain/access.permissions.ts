import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'access';
const def = (key: string, labelAr: string, labelEn: string): PermissionDefinition => ({ key, module: MODULE, labelAr, labelEn, scopes: ['all'] });

export const ACCESS_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.RolesView, 'عرض صفحة الأدوار والصلاحيات', 'View the roles and permissions page'),
  def(CorePermission.RolesCreate, 'إضافة دور', 'Add a role'),
  def(CorePermission.RolesUpdate, 'تعديل دور وصلاحياته', 'Edit a role and its permissions'),
  def(CorePermission.RolesDelete, 'حذف دور', 'Delete a role'),
  def(CorePermission.RolesExport, 'تصدير الأدوار', 'Export roles'),
  def(CorePermission.RolesSyncAuto, 'تحديث أعضاء الأدوار التلقائية الآن', 'Refresh the members of the automatic roles now'),
  def(CorePermission.ExceptionsView, 'عرض صفحة الاستثناءات (ما مُنح خارج المسمى)', 'View the exceptions page (what was given outside the job title)'),
  def(CorePermission.ExceptionsUpdate, 'تغيير تاريخ انتهاء استثناء', 'Change the end date of an exception'),
  def(CorePermission.ExceptionsRevoke, 'سحب استثناء', 'Take an exception back'),
  def(CorePermission.ExceptionsExport, 'تصدير الاستثناءات', 'Export the exceptions'),
  def(CorePermission.RoleGroupsView, 'عرض مجموعات الأدوار في صفحة الصلاحيات', 'View groups of roles on the permissions page'),
  def(CorePermission.RoleGroupsCreate, 'إضافة مجموعة أدوار', 'Add a role group'),
  def(CorePermission.RoleGroupsUpdate, 'تعديل مجموعة أدوار', 'Edit a role group'),
  def(CorePermission.RoleGroupsDelete, 'حذف مجموعة أدوار', 'Delete a role group'),
  def(CorePermission.UserGroupsView, 'عرض مجموعات المستخدمين في صفحة الصلاحيات', 'View groups of people on the permissions page'),
  def(CorePermission.UserGroupsCreate, 'إضافة مجموعة مستخدمين', 'Add a user group'),
  def(CorePermission.UserGroupsUpdate, 'تعديل مجموعة مستخدمين وأعضائها', 'Edit a user group and its members'),
  def(CorePermission.UserGroupsDelete, 'حذف مجموعة مستخدمين', 'Delete a user group'),
  def(CorePermission.PermissionsView, 'عرض صفحة الصلاحيات', 'View the permissions page'),
  def(CorePermission.PermissionsRoleUpdate, 'تحديد صلاحيات دور', 'Set the permissions of a role'),
  def(CorePermission.PermissionsRoleGroupUpdate, 'تحديد صلاحيات مجموعة أدوار', 'Set the permissions of a group of roles'),
  def(CorePermission.PermissionsUserUpdate, 'تحديد صلاحيات شخص بعينه', 'Set the permissions of one person'),
  def(CorePermission.PermissionsUserGroupUpdate, 'تحديد صلاحيات مجموعة مستخدمين', 'Set the permissions of a group of people'),
  def(CorePermission.AdminModeUse, 'استخدام وضع مدير المنصة', 'Use platform admin mode'),
  def(CorePermission.PagesView, 'عرض صفحة ظهور الصفحات', 'View the page visibility page'),
  def(CorePermission.PagesManage, 'إخفاء الصفحات وإظهارها لكل دور', 'Hide and show pages for each role'),
  def(CorePermission.ProfileView, 'عرض الملف الشخصي', 'View my profile'),
  def(CorePermission.ProfileUpdate, 'تعديل بياناتي الشخصية والتفضيلات', 'Edit my contact details and preferences'),
  def(CorePermission.SecurityView, 'عرض صفحة الأمان', 'View the security page'),
];
