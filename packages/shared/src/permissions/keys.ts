/** Permission keys of the core (foundation) and identity modules. Feature modules add their own files. */
export const CorePermission = {
  RolesView: 'roles.view',
  RolesManage: 'roles.manage',
  AdminModeUse: 'admin_mode.use',
  TicketsAdminister: 'tickets.administer',
  AuditView: 'audit.view',
  EmailLogView: 'notifications.email_log',
  LookupsView: 'lookups.view',
  CompaniesView: 'companies.view',
  CompaniesManage: 'companies.manage',
  OrgView: 'org.view',
  OrgManage: 'org.manage',
  EmployeesView: 'employees.view',
  EmployeesCreate: 'employees.create',
  EmployeesUpdate: 'employees.update',
  EmployeesDeactivate: 'employees.deactivate',
  EmployeesViewSensitive: 'employees.view_sensitive',
  EmployeesAssignRoles: 'employees.assign_roles',
} as const;
export type CorePermissionKey = (typeof CorePermission)[keyof typeof CorePermission];
