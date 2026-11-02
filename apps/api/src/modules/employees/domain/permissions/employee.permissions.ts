import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'employees';
const def = (key: string, labelAr: string, labelEn: string, scopes: PermissionDefinition['scopes']): PermissionDefinition => ({ key, module: MODULE, labelAr, labelEn, scopes });
const RECORD: PermissionDefinition['scopes'] = ['unit', 'subtree', 'company', 'all'];
const WIDE: PermissionDefinition['scopes'] = ['subtree', 'company', 'all'];

export const EMPLOYEE_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.EmployeesView, 'عرض الموظفين', 'View employees', ['own', 'unit', 'subtree', 'company', 'all']),
  def(CorePermission.EmployeesCreate, 'إضافة موظفين', 'Add employees', RECORD),
  def(CorePermission.EmployeesUpdate, 'تعديل بيانات الموظفين', 'Edit employees', ['own', ...RECORD]),
  def(CorePermission.EmployeesDeactivate, 'تعطيل الموظفين وتفعيلهم', 'Deactivate and activate employees', WIDE),
  def(CorePermission.EmployeesTerminate, 'إنهاء علاقة الموظف', 'End an employee\'s contract', WIDE),
  def(CorePermission.EmployeesViewSensitive, 'عرض البيانات الحساسة (الهوية والآيبان والراتب)', 'View sensitive data (ID, IBAN, salary)', WIDE),
  def(CorePermission.EmployeesAssignRoles, 'تعيين أدوار الموظفين', 'Assign employee roles', ['company', 'all']),
  def(CorePermission.EmployeesAssignGroups, 'تعيين مجموعات أدوار للموظف', 'Give an employee groups of roles', ['company', 'all']),
  def(CorePermission.EmployeesResendInvite, 'إعادة إرسال رابط التفعيل', 'Resend the activation link', RECORD),
  def(CorePermission.EmployeesResetAuthenticator, 'إعادة ضبط تطبيق المصادقة', 'Reset the authenticator app', RECORD),
  def(CorePermission.EmployeesExport, 'تصدير الموظفين', 'Export employees', ['all']),
  def(CorePermission.EmployeesImport, 'استيراد الموظفين من ملف', 'Import employees from a file', ['all']),
];
