import type { ReactionKey, ReactionTargetType } from '@arweqah-platform/shared';

export interface ReactionTarget {
  type: ReactionTargetType;
  id: string;
}

/** One person's reaction on one target, with the name to show. */
export interface ReactionRow {
  targetId: string;
  userId: string;
  name: string;
  reaction: ReactionKey;
}
