import type { FeatureModule } from '@/core/feature';
import { CorePermission } from '@arweqah-platform/shared';
import ar from './i18n/ar.json';
import en from './i18n/en.json';

export { AgentChat, useAgentAvailable } from './agent-chat';

/** The assistant has no page of its own: it is a panel in the shell (`AgentChat`), so it declares only its texts and its welcome-tour step. */
export const agentChatFeature: FeatureModule = {
  id: 'agentChat',
  routes: [],
  i18n: { ar, en },
  tour: [{ key: 'agent-chat', target: '[data-tour="agent-chat"]', placement: 'top' }],
};

export const AGENT_CHAT_PERMISSION = CorePermission.AgentView;
