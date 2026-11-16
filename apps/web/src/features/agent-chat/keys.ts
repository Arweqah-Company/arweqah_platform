import { CorePermission } from '@arweqah-platform/shared';

/** The permissions of the platform assistant (what it does for a person always goes through the key of the action itself). */
export const AGENT_KEYS = { view: CorePermission.AgentView, use: CorePermission.AgentUse, history: CorePermission.AgentHistoryView } as const;
