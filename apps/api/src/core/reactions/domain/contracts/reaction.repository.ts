import type { ReactionKey, ReactionTargetType } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import type { ReactionRow, ReactionTarget } from '../types/reaction.types';

export abstract class ReactionRepository {
  /** Puts the person's reaction on the target (replacing the one they had); true when they had none before. */
  abstract put(target: ReactionTarget, userId: string, reaction: ReactionKey, tx: TransactionContext): Promise<boolean>;
  abstract remove(target: ReactionTarget, userId: string, tx: TransactionContext): Promise<void>;
  /** Every reaction on the given targets of one kind, oldest first, with the person's name. */
  abstract rows(type: ReactionTargetType, targetIds: string[]): Promise<ReactionRow[]>;
}
