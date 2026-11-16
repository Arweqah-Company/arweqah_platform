import { CorePermission, type PermissionDefinition } from '@arweqah-platform/shared';

const MODULE = 'agent';

export const AGENT_PERMISSIONS: PermissionDefinition[] = [
  { key: CorePermission.AgentView, module: MODULE, labelAr: 'فتح مساعد المنصة', labelEn: 'Open the platform assistant', scopes: ['all'] },
  { key: CorePermission.AgentUse, module: MODULE, labelAr: 'التحدث مع مساعد المنصة وتأكيد طلباته', labelEn: 'Talk to the platform assistant and confirm its requests', scopes: ['all'] },
  { key: CorePermission.AgentHistoryView, module: MODULE, labelAr: 'عرض محادثاتي السابقة مع المساعد', labelEn: 'View my earlier conversations with the assistant', scopes: ['all'] },
];
