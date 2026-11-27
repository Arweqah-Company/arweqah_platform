import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'employees';
const def = (key: string, labelAr: string, labelEn: string, scopes: PermissionDefinition['scopes']): PermissionDefinition => ({ key, module: MODULE, labelAr, labelEn, scopes });
const RECORD: PermissionDefinition['scopes'] = ['unit', 'subtree', 'company', 'all'];
const WIDE: PermissionDefinition['scopes'] = ['subtree', 'company', 'all'];

export const EMPLOYEE_PERMISSIONS: PermissionDefinition[] = [
  def(CorePermission.EmployeesView, 'عرض الموظفين', 'View employees', ['own', 'unit', 'subtree', 'company', 'all']),
  def(CorePermission.EmployeesOpen, 'فتح صفحة الموظف (العين والضغط على الصف) واختيار الحقول التي تظهر فيها', 'Open an employee (the row\'s eye, a click on the row and the page) and choose the details shown on it', ['own', 'unit', 'subtree', 'company', 'all']),
  def(CorePermission.EmployeesCreate, 'إضافة موظفين', 'Add employees', RECORD),
  def(CorePermission.EmployeesUpdate, 'تعديل بيانات الموظفين', 'Edit employees', ['own', ...RECORD]),
  def(CorePermission.EmployeesDeactivate, 'تعطيل الموظفين وتفعيلهم', 'Deactivate and activate employees', WIDE),
  def(CorePermission.EmployeesTerminate, 'إنهاء علاقة الموظف', 'End an employee\'s contract', WIDE),
  def(CorePermission.EmployeesViewSensitive, 'عرض البيانات الحساسة (الهوية والآيبان والراتب)', 'View sensitive data (ID, IBAN, salary)', WIDE),
  def(CorePermission.EmployeesAssignRoles, 'تعيين أدوار الموظفين', 'Assign employee roles', ['unit', 'subtree', 'company', 'all']),
  def(CorePermission.EmployeesAssignGroups, 'تعيين مجموعات أدوار للموظف', 'Give an employee groups of roles', ['company', 'all']),
  def(CorePermission.EmployeesAssignChange, 'تغيير وحدة الموظف أو مسماه أو مديره بتاريخ سريان', 'Change an employee\'s unit, job title or manager from a date', RECORD),
  def(CorePermission.EmployeesBulkUpdate, 'تعديل جماعي لبيانات الموظفين', 'Edit many employees at once', WIDE),
  def(CorePermission.EmployeesHistoryView, 'عرض سجل الموظف (تسكينه وتغييراته)', 'View an employee\'s history (placement and changes)', ['own', ...RECORD]),
  def(CorePermission.EmployeesPhotoUpdate, 'تغيير صورة الموظف', 'Change an employee\'s photo', ['own', ...RECORD]),
  def(CorePermission.EmployeesResendInvite, 'إعادة إرسال رابط التفعيل', 'Resend the activation link', RECORD),
  def(CorePermission.EmployeesResetAuthenticator, 'إعادة ضبط تطبيق المصادقة', 'Reset the authenticator app', RECORD),
  def(CorePermission.EmployeesExport, 'تصدير الموظفين', 'Export employees', WIDE),
  def(CorePermission.EmployeesImport, 'استيراد الموظفين من ملف', 'Import employees from a file', WIDE),
  def(CorePermission.EmployeesFiguresHeadcount, 'أرقام الرئيسية: عدد الموظفين وعلى رأس العمل وبحاجة لتعيين', 'Home numbers: employees, on duty and needing placement', WIDE),
  def(CorePermission.EmployeesFiguresIdExpiring, 'أرقام الرئيسية: هويات تنتهي أو منتهية', 'Home numbers: identities expiring or expired', WIDE),
  def(CorePermission.EmployeesFiguresContractEnding, 'أرقام الرئيسية: عقود تنتهي قريبًا', 'Home numbers: contracts ending soon', WIDE),
];

const directory = (key: string, labelAr: string, labelEn: string): PermissionDefinition => ({ key, module: 'directory', labelAr, labelEn, scopes: ['all'] });

/** «My team» (FR-92): basic details of the colleagues of the person's own unit. The unit is the reach, so the key has one scope. */
export const DIRECTORY_PERMISSIONS: PermissionDefinition[] = [
  directory(CorePermission.DirectoryView, 'عرض فريقي (زملاء وحدتي)', 'View my team (colleagues of my unit)'),
  directory(CorePermission.DirectoryExport, 'تصدير فريقي', 'Export my team'),
  directory(CorePermission.DirectoryContactTeams, 'محادثة زميل على Teams', 'Chat with a colleague on Teams'),
];

