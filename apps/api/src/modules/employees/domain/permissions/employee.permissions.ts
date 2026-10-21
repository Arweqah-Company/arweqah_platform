import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'employees';

export const EMPLOYEE_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.EmployeesView, module: MODULE, labelAr: 'عرض الموظفين', labelEn: 'View employees', scopes: ['own', 'unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.EmployeesCreate, module: MODULE, labelAr: 'إضافة موظفين', labelEn: 'Add employees', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.EmployeesUpdate, module: MODULE, labelAr: 'تعديل بيانات الموظفين', labelEn: 'Edit employees', scopes: ['unit', 'subtree', 'company', 'all'] },
  { key: CorePermission.EmployeesDeactivate, module: MODULE, labelAr: 'تعطيل الموظفين وإنهاء علاقتهم', labelEn: 'Deactivate employees and end their contract', scopes: ['subtree', 'company', 'all'] },
  { key: CorePermission.EmployeesViewSensitive, module: MODULE, labelAr: 'عرض البيانات الحساسة (الهوية والآيبان والراتب)', labelEn: 'View sensitive data (ID, IBAN, salary)', scopes: ['subtree', 'company', 'all'] },
  { key: CorePermission.EmployeesAssignRoles, module: MODULE, labelAr: 'تعيين أدوار الموظفين', labelEn: 'Assign employee roles', scopes: ['company', 'all'] },
];
