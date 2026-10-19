import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const ACCESS_PERMISSIONS: PermissionDefinition[] = [
  {
    key: CorePermission.RolesView,
    module: 'access',
    labelAr: 'عرض الأدوار والصلاحيات',
    labelEn: 'View roles and permissions',
    scopes: ['company'],
  },
  {
    key: CorePermission.RolesManage,
    module: 'access',
    labelAr: 'إدارة الأدوار والصلاحيات',
    labelEn: 'Manage roles and permissions',
    scopes: ['company'],
  },
];
