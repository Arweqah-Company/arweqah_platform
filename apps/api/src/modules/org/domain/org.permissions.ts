import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const ORG_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.OrgView, module: 'org', labelAr: 'عرض الهيكل التنظيمي', labelEn: 'View organization structure', scopes: ['company'] },
  { key: CorePermission.OrgManage, module: 'org', labelAr: 'إدارة الفروع والأقسام والفرق', labelEn: 'Manage branches, departments and teams', scopes: ['company'] },
];
