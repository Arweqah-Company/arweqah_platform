/**
 * Permission keys of the platform: one for every page (view) and one for every button or action (add, edit, delete, move,
 * approve, reject, export, import…). A page needs its view key; a button shows only for people who hold its key, and the
 * API refuses the action without it. Feature modules that come later add their own keys the same way.
 */
export const CorePermission = {
  // Platform administration
  AdminModeUse: 'admin_mode.use',
  RolesView: 'roles.view',
  RolesCreate: 'roles.create',
  RolesUpdate: 'roles.update',
  RolesDelete: 'roles.delete',
  RolesExport: 'roles.export',
  PagesView: 'pages.view',
  PagesManage: 'pages.manage',
  ListsView: 'lists.view',
  ListsManage: 'lists.manage',
  AuditView: 'audit.view',
  AuditExport: 'audit.export',
  EmailLogView: 'notifications.email_log',
  EmailLogExport: 'notifications.email_log_export',
  LookupsView: 'lookups.view',
  // My account
  ProfileView: 'profile.view',
  ProfileUpdate: 'profile.update',
  SecurityView: 'security.view',
  NotificationsView: 'notifications.view',
  NotificationsMarkRead: 'notifications.mark_read',
  NotificationsExport: 'notifications.export',
  // Companies and organization structure
  CompaniesView: 'companies.view',
  CompaniesCreate: 'companies.create',
  CompaniesUpdate: 'companies.update',
  CompaniesDelete: 'companies.delete',
  CompaniesExport: 'companies.export',
  CompaniesImport: 'companies.import',
  OrgView: 'org.view',
  OrgUnitCreate: 'org.unit_create',
  OrgUnitUpdate: 'org.unit_update',
  OrgUnitMove: 'org.unit_move',
  OrgUnitDelete: 'org.unit_delete',
  OrgLevelsManage: 'org.levels_manage',
  OrgTitlesManage: 'org.titles_manage',
  OrgExport: 'org.export',
  // Employees
  EmployeesView: 'employees.view',
  EmployeesCreate: 'employees.create',
  EmployeesUpdate: 'employees.update',
  EmployeesDeactivate: 'employees.deactivate',
  EmployeesTerminate: 'employees.terminate',
  EmployeesViewSensitive: 'employees.view_sensitive',
  EmployeesAssignRoles: 'employees.assign_roles',
  EmployeesResendInvite: 'employees.resend_invite',
  EmployeesResetAuthenticator: 'employees.reset_authenticator',
  EmployeesExport: 'employees.export',
  EmployeesImport: 'employees.import',
  // Tickets
  TicketsView: 'tickets.view',
  TicketsCreate: 'tickets.create',
  TicketsReply: 'tickets.reply',
  TicketsRequestClose: 'tickets.request_close',
  TicketsConfirmClose: 'tickets.confirm_close',
  TicketsDeclineClose: 'tickets.decline_close',
  TicketsCloseWithoutExecution: 'tickets.close_without_execution',
  TicketsReopen: 'tickets.reopen',
  TicketsSetupView: 'tickets.setup_view',
  TicketsSetupEdit: 'tickets.setup_edit',
  TicketsTypeCreate: 'tickets.type_create',
  TicketsTypeUpdate: 'tickets.type_update',
  TicketsTypeDelete: 'tickets.type_delete',
  TicketsFiguresView: 'tickets.figures_view',
  /** Every department instead of only the ones the person manages (setup and figures). */
  TicketsAdminister: 'tickets.administer',
} as const;
export type CorePermissionKey = (typeof CorePermission)[keyof typeof CorePermission];

/** What every employee holds from the start (the "Employee" role): own account pages and sending and following tickets. */
export const EMPLOYEE_DEFAULT_PERMISSIONS: CorePermissionKey[] = [
  CorePermission.ProfileView,
  CorePermission.ProfileUpdate,
  CorePermission.SecurityView,
  CorePermission.NotificationsView,
  CorePermission.NotificationsMarkRead,
  CorePermission.TicketsView,
  CorePermission.TicketsCreate,
  CorePermission.TicketsReply,
  CorePermission.TicketsRequestClose,
  CorePermission.TicketsConfirmClose,
  CorePermission.TicketsDeclineClose,
  CorePermission.TicketsCloseWithoutExecution,
  CorePermission.TicketsReopen,
];

/** Groups of keys that belong together (used by seeds and tests, and to give an administrator a whole area at once). */
export const ORG_ADMIN_PERMISSIONS: CorePermissionKey[] = [
  CorePermission.OrgView,
  CorePermission.OrgUnitCreate,
  CorePermission.OrgUnitUpdate,
  CorePermission.OrgUnitMove,
  CorePermission.OrgUnitDelete,
  CorePermission.OrgLevelsManage,
  CorePermission.OrgTitlesManage,
];
export const COMPANIES_ADMIN_PERMISSIONS: CorePermissionKey[] = [CorePermission.CompaniesView, CorePermission.CompaniesCreate, CorePermission.CompaniesUpdate, CorePermission.CompaniesDelete];
export const ROLES_ADMIN_PERMISSIONS: CorePermissionKey[] = [CorePermission.RolesView, CorePermission.RolesCreate, CorePermission.RolesUpdate, CorePermission.RolesDelete];
