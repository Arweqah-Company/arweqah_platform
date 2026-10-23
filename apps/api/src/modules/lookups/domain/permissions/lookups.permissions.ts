import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const LOOKUPS_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.LookupsView, module: 'lookups', labelAr: 'عرض خيارات النماذج (القوائم المنسدلة)', labelEn: 'View form options (drop-down lists)', scopes: ['all'] },
];
