import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { returnedRows } from '../../../../common/infrastructure/query-result';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { NoticeDeliveryRepository, type DeliveryInsert } from '../../domain/contracts/notice-delivery.repository';
import { Notice } from '../../domain/entities/notice.entities';
import type { AudienceSets } from '../../domain/rules/notice-audience.rules';
import type { NoticeRecord } from '../../domain/types/notice.types';
import { ACTIVE_AUDIENCE, audienceParams, sql } from './notice-sql';

@Injectable()
export class TypeOrmNoticeDeliveryRepository extends NoticeDeliveryRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async countAudience(sets: AudienceSets): Promise<number> {
    const rows: { n: number }[] = await this.ds.query(sql`SELECT count(*)::int AS n FROM (${ACTIVE_AUDIENCE}) a`, audienceParams(sets));
    return rows[0]?.n ?? 0;
  }

  async audienceSlice(sets: AudienceSets, offset: number, limit: number): Promise<string[]> {
    const rows: { user_id: string }[] = await this.ds.query(sql`SELECT a.user_id FROM (${ACTIVE_AUDIENCE}) a ORDER BY a.user_id LIMIT $6 OFFSET $7`, [...audienceParams(sets), limit, offset]);
    return rows.map((r) => r.user_id);
  }

  async missing(sets: AudienceSets, noticeId: string, limit: number): Promise<string[]> {
    const rows: { user_id: string }[] = await this.ds.query(
      `SELECT a.user_id FROM (${ACTIVE_AUDIENCE}) a WHERE NOT EXISTS (SELECT 1 FROM notice_recipients r WHERE r.notice_id = $6 AND r.user_id = a.user_id) ORDER BY a.user_id LIMIT $7`,
      [...audienceParams(sets), noticeId, limit],
    );
    return rows.map((r) => r.user_id);
  }

  async addRecipients(data: DeliveryInsert, tx: TransactionContext): Promise<string[]> {
    if (!data.userIds.length) return [];
    const result = await this.m(tx).query(
      `INSERT INTO notice_recipients (notice_id, user_id, joined_after_publish) SELECT $1, u, $3 FROM unnest($2::uuid[]) AS u ON CONFLICT (notice_id, user_id) DO NOTHING RETURNING user_id`,
      [data.noticeId, data.userIds, data.joinedAfterPublish],
    );
    return returnedRows<{ user_id: string }>(result).map((r) => r.user_id);
  }

  async markNotified(noticeId: string, userIds: string[], version: number, tx: TransactionContext): Promise<string[]> {
    if (!userIds.length) return [];
    const result = await this.m(tx).query(
      `UPDATE notice_recipients SET notified_version = $3 WHERE notice_id = $1 AND user_id = ANY($2) AND notified_version < $3 RETURNING user_id`,
      [noticeId, userIds, version],
    );
    return returnedRows<{ user_id: string }>(result).map((r) => r.user_id);
  }

  async recipientCount(noticeId: string): Promise<number> {
    const rows: { n: number }[] = await this.ds.query('SELECT count(*)::int AS n FROM notice_recipients WHERE notice_id = $1', [noticeId]);
    return rows[0]?.n ?? 0;
  }

  async catchUpCandidates(): Promise<NoticeRecord[]> {
    const notices = await this.ds.manager.find(Notice, { where: { status: 'published' } });
    return notices.filter((n) => n.deliveryCompletedAt !== null && n.archivedAt === null).map((n) => Object.assign(n, { unitCompanyId: null }));
  }

  async clearReads(noticeId: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).query(`UPDATE notice_recipients SET read_at = NULL WHERE notice_id = $1`, [noticeId]);
  }

  async markRead(noticeId: string, userId: string): Promise<void> {
    await this.ds.query(`UPDATE notice_recipients SET read_at = now() WHERE notice_id = $1 AND user_id = $2 AND read_at IS NULL`, [noticeId, userId]);
  }

  async acknowledge(noticeId: string, userId: string, version: number): Promise<boolean> {
    const result = await this.ds.query(
      `UPDATE notice_recipients SET acknowledged_at = COALESCE(CASE WHEN acknowledged_version >= $3 THEN acknowledged_at END, now()), acknowledged_version = GREATEST(COALESCE(acknowledged_version, 0), $3),
         read_at = COALESCE(read_at, now()) WHERE notice_id = $1 AND user_id = $2 RETURNING id`,
      [noticeId, userId, version],
    );
    return returnedRows<{ id: string }>(result).length === 1;
  }

  async recipient(noticeId: string, userId: string): Promise<{ readAt: Date | null; acknowledgedVersion: number | null } | null> {
    const rows: { readAt: Date | null; acknowledgedVersion: number | null }[] = await this.ds.query(
      'SELECT read_at AS "readAt", acknowledged_version AS "acknowledgedVersion" FROM notice_recipients WHERE notice_id = $1 AND user_id = $2',
      [noticeId, userId],
    );
    return rows[0] ?? null;
  }
}
