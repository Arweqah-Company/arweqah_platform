import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const LISTS_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.ListsView, module: 'lists', labelAr: 'عرض صفحة إدارة القوائم', labelEn: 'View the list management page', scopes: ['all'] },
  { key: CorePermission.ListsManage, module: 'lists', labelAr: 'تغيير أعمدة القوائم وفلاترها', labelEn: 'Change the columns and filters of lists', scopes: ['all'] },
];
