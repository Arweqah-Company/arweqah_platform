/** Permission keys of the foundation modules. Feature modules add their own files. */
export const CorePermission = {
  UsersView: 'users.view',
  UsersManage: 'users.manage',
  RolesView: 'roles.view',
  RolesManage: 'roles.manage',
  OrgView: 'org.view',
  OrgManage: 'org.manage',
  AuditView: 'audit.view',
} as const;
export type CorePermissionKey = (typeof CorePermission)[keyof typeof CorePermission];
