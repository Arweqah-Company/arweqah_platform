import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ReactionKey, ReactionTargetType } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { ReactionRepository } from '../../domain/contracts/reaction.repository';
import type { ReactionRow, ReactionTarget } from '../../domain/types/reaction.types';

@Injectable()
export class TypeOrmReactionRepository extends ReactionRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  /** One statement keeps "one reaction per person" under concurrent clicks; `xmax = 0` is true only for a row that was inserted, not updated. */
  async put(target: ReactionTarget, userId: string, reaction: ReactionKey, tx: TransactionContext): Promise<boolean> {
    const rows: { inserted: boolean }[] = await managerOf(tx, this.ds.manager).query(
      `INSERT INTO conversation_reactions (target_type, target_id, user_id, reaction) VALUES ($1, $2, $3, $4)
       ON CONFLICT (target_type, target_id, user_id) DO UPDATE SET reaction = EXCLUDED.reaction
       RETURNING (xmax = 0) AS inserted`,
      [target.type, target.id, userId, reaction],
    );
    return rows[0]?.inserted === true;
  }

  async remove(target: ReactionTarget, userId: string, tx: TransactionContext): Promise<void> {
    await managerOf(tx, this.ds.manager).query('DELETE FROM conversation_reactions WHERE target_type = $1 AND target_id = $2 AND user_id = $3', [target.type, target.id, userId]);
  }

  rows(type: ReactionTargetType, targetIds: string[]): Promise<ReactionRow[]> {
    return this.ds.query(
      `SELECT r.target_id AS "targetId", r.user_id AS "userId", COALESCE(e.full_name, u.name) AS name, r.reaction
       FROM conversation_reactions r JOIN users u ON u.id = r.user_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
       WHERE r.target_type = $1 AND r.target_id = ANY($2) ORDER BY r.created_at, r.user_id`,
      [type, targetIds],
    );
  }
}
