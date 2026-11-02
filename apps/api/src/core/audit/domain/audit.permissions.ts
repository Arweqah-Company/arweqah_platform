import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const AUDIT_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.AuditVerify, module: 'audit', labelAr: 'التحقق من سلامة سجل التدقيق', labelEn: 'Check the audit log has not been tampered with', scopes: ['all'] },
  { key: CorePermission.AuditView, module: 'audit', labelAr: 'عرض صفحة سجل التدقيق', labelEn: 'View the audit log page', scopes: ['all'] },
  { key: CorePermission.AuditExport, module: 'audit', labelAr: 'تصدير سجل التدقيق', labelEn: 'Export the audit log', scopes: ['all'] },
];
