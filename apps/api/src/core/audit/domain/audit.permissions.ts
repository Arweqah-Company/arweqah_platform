import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const AUDIT_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.AuditView, module: 'audit', labelAr: 'عرض سجل التدقيق', labelEn: 'View audit log', scopes: ['all'] },
];
