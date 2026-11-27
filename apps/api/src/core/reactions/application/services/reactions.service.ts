import { Injectable } from '@nestjs/common';
import { MAX_REACTION_NAMES, REACTION_KEYS, type ReactionKey, type ReactionSummaryDto, type ReactionTargetType } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/application/transaction-runner';
import { ReactionRepository } from '../../domain/contracts/reaction.repository';
import type { ReactionRow, ReactionTarget } from '../../domain/types/reaction.types';

/**
 * The reactions on the replies of tickets and the comments of tasks, one implementation for both. The module that owns the reply decides who may
 * react (it can see the reply, holds the key); this service only keeps the one reaction per person and builds the chips.
 */
@Injectable()
export class ReactionsService {
  constructor(private readonly reactions: ReactionRepository) {}

  /** Puts the reaction on the target in the caller's transaction; true when it is the person's first one there (so the author is told once). */
  set(target: ReactionTarget, userId: string, reaction: ReactionKey, tx: TransactionContext): Promise<boolean> {
    return this.reactions.put(target, userId, reaction, tx);
  }

  clear(target: ReactionTarget, userId: string, tx: TransactionContext): Promise<void> {
    return this.reactions.remove(target, userId, tx);
  }

  /** The chips of each target (only targets with reactions appear), in the order of `REACTION_KEYS`, for the viewer. */
  async summaries(type: ReactionTargetType, targetIds: string[], viewerId: string): Promise<Map<string, ReactionSummaryDto[]>> {
    const byTarget = new Map<string, ReactionRow[]>();
    for (const row of targetIds.length ? await this.reactions.rows(type, targetIds) : []) byTarget.set(row.targetId, [...(byTarget.get(row.targetId) ?? []), row]);
    return new Map([...byTarget].map(([id, rows]) => [id, chipsOf(rows, viewerId)]));
  }
}

function chipsOf(rows: ReactionRow[], viewerId: string): ReactionSummaryDto[] {
  return REACTION_KEYS.flatMap((reaction) => {
    const used = rows.filter((r) => r.reaction === reaction);
    if (!used.length) return [];
    return [{ reaction, count: used.length, mine: used.some((r) => r.userId === viewerId), people: used.slice(0, MAX_REACTION_NAMES).map((r) => ({ id: r.userId, name: r.name })) }];
  });
}
