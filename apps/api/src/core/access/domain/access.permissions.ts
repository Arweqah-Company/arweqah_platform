import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const ACCESS_PERMISSIONS: PermissionDefinition[] = [
  {
    key: CorePermission.RolesView,
    module: 'access',
    labelAr: 'عرض الأدوار والصلاحيات',
    labelEn: 'View roles and permissions',
    scopes: ['all'],
  },
  {
    key: CorePermission.RolesManage,
    module: 'access',
    labelAr: 'إدارة الأدوار والصلاحيات',
    labelEn: 'Manage roles and permissions',
    scopes: ['all'],
  },
  {
    key: CorePermission.AdminModeUse,
    module: 'access',
    labelAr: 'استخدام وضع مدير المنصة',
    labelEn: 'Use platform admin mode',
    scopes: ['all'],
  },
];
