import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const USERS_PERMISSIONS: PermissionDefinition[] = [
  {
    key: CorePermission.UsersView,
    module: 'users',
    labelAr: 'عرض المستخدمين',
    labelEn: 'View users',
    scopes: ['team', 'department', 'branch', 'company'],
  },
  {
    key: CorePermission.UsersManage,
    module: 'users',
    labelAr: 'إضافة المستخدمين وتعديل أدوارهم وحالتهم',
    labelEn: 'Create users and manage their roles and status',
    scopes: ['department', 'branch', 'company'],
  },
];
