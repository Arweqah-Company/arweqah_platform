import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const LOOKUPS_PERMISSIONS: PermissionDefinition[] = [
  {
    key: CorePermission.LookupsView,
    module: 'lookups',
    labelAr: 'عرض خيارات النماذج',
    labelEn: 'View form options',
    scopes: ['all'],
  },
];
