import type { AgentStatusDto } from '@arweqah-platform/shared';

/** What the assistant is doing, as a code the screen words in its own language (never text from the model). */
export type AgentStatus = AgentStatusDto;

/** Where a live screen is told what is happening while one message is worked on (FR-149). */
export interface AgentTurnEvents {
  status: (status: AgentStatus) => void;
  /** A piece of the text of the answer the assistant is writing now; the final message replaces everything shown. */
  text: (delta: string) => void;
}
