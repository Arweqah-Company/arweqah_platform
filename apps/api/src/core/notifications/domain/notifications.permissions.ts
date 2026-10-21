import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

export const NOTIFICATIONS_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.EmailLogView, module: 'notifications', labelAr: 'عرض سجل البريد المرسل', labelEn: 'View sent e-mail log', scopes: ['all'] },
];
