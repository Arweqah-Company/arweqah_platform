import { z } from 'zod';

/** The six reactions a person may leave on a reply of a ticket or a comment of a task (FR-206). The screen draws the emoji. */
export const REACTION_KEYS = ['like', 'love', 'care', 'haha', 'wow', 'sad'] as const;
export type ReactionKey = (typeof REACTION_KEYS)[number];

/** What a reaction is left on: one shared table serves tickets and tasks. */
export const REACTION_TARGET_TYPES = ['ticket_event', 'task_comment'] as const;
export type ReactionTargetType = (typeof REACTION_TARGET_TYPES)[number];

/** How many names a chip carries for its hover (the count is always complete). */
export const MAX_REACTION_NAMES = 20;

/** One reaction per person on a reply: sending another replaces it, and a delete removes it. */
export const reactionInputSchema = z.strictObject({ reaction: z.enum(REACTION_KEYS) });
export type ReactionInput = z.infer<typeof reactionInputSchema>;

/** One chip under a reply: a reaction somebody used, how many used it, whether the viewer did, and the first names. */
export interface ReactionSummaryDto {
  reaction: ReactionKey;
  count: number;
  mine: boolean;
  people: { id: string; name: string }[];
}
