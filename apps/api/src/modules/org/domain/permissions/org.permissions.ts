import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const ORG_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.CompaniesView, module: 'org', labelAr: 'عرض الشركات', labelEn: 'View companies', scopes: ['all'] },
  { key: CorePermission.CompaniesManage, module: 'org', labelAr: 'إدارة الشركات', labelEn: 'Manage companies', scopes: ['all'] },
  { key: CorePermission.OrgView, module: 'org', labelAr: 'عرض الهيكل التنظيمي', labelEn: 'View organization structure', scopes: ['company', 'all'] },
  { key: CorePermission.OrgManage, module: 'org', labelAr: 'إدارة الهيكل التنظيمي', labelEn: 'Manage organization structure', scopes: ['company', 'all'] },
];
