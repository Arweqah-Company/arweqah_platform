import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const LISTS_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.ListsManage, module: 'lists', labelAr: 'إدارة القوائم', labelEn: 'Manage lists', scopes: ['all'] },
];
