import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import { NOTICE_WRITER_ROLE_PERMISSIONS } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { NoticeChannelRepository, type PeopleScope } from '../../domain/contracts/notice-channel.repository';
import { Notice, NoticeChannel, NoticeChannelWriter } from '../../domain/entities/notice.entities';
import { NOTICE_CHANNEL_SEEDS, type NoticeChannelSeed } from '../../domain/rules/notice-channels.rules';
import type { CandidateRow, ChannelRow, EmployeeFacts, NewChannel, UnitFacts, UnitOption, WriterRow } from '../../domain/types/notice.types';
import { unitScopeSql, Where, sql } from './notice-sql';

const TITLE_NAME = (lang: string) => `(SELECT x.name FROM job_title_translations x WHERE x.job_title_id = e.job_title_id AND x.lang = '${lang}')`;
const NODE_NAME = (lang: string) => `(SELECT x.name FROM org_node_translations x WHERE x.org_node_id = n.id AND x.lang = '${lang}')`;
const UNIT_NAME = (lang: string) => `(SELECT x.name FROM org_node_translations x WHERE x.org_node_id = e.org_node_id AND x.lang = '${lang}')`;

const PERSON_COLUMNS = `e.org_node_id AS "orgNodeId", e.company_id AS "companyId", e.org_node_id AS "unitId",
  ${TITLE_NAME('ar')} AS "jobTitleAr", ${TITLE_NAME('en')} AS "jobTitleEn", ${UNIT_NAME('ar')} AS "unitNameAr", ${UNIT_NAME('en')} AS "unitNameEn"`;

const WRITER_SELECT = `
  SELECT w.user_id AS "userId", e.id AS "employeeId", COALESCE(e.full_name, u.name) AS name, ${PERSON_COLUMNS}, w.added_at AS "addedAt",
    (SELECT count(*)::int FROM notices n WHERE n.author_id = w.user_id AND n.channel_id = w.channel_id AND n.status IN ('draft', 'rejected', 'revising')) AS drafts,
    (SELECT count(*)::int FROM notices n WHERE n.author_id = w.user_id AND n.channel_id = w.channel_id AND n.status = 'pending_approval') AS "pendingApproval"
  FROM notice_channel_writers w JOIN users u ON u.id = w.user_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL`;

/** Is there somebody above (or at) the unit, other than the person, who leads it? Without one a platform administrator approves. */
const HAS_NO_APPROVER = `NOT EXISTS (
  SELECT 1 FROM org_node_closure c JOIN org_nodes a ON a.id = c.ancestor_id AND a.deleted_at IS NULL
  JOIN employees m ON m.id = a.manager_id AND m.deleted_at IS NULL AND m.user_id <> e.user_id JOIN users mu ON mu.id = m.user_id AND mu.is_active
  WHERE c.descendant_id = e.org_node_id)`;

@Injectable()
export class TypeOrmNoticeChannelRepository extends NoticeChannelRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  writers(channelId: string, scope: PeopleScope, filters: { search?: string; unitId?: string }): Promise<WriterRow[]> {
    const w = new Where();
    w.add(`w.channel_id = ${w.bind(channelId)}`);
    w.add(unitScopeSql(scope, { unit: 'e.org_node_id', company: 'e.company_id' }, w));
    w.search(['COALESCE(e.full_name, u.name)'], filters.search ? likeContains(filters.search) : undefined);
    if (filters.unitId) w.add(`e.org_node_id IN (SELECT descendant_id FROM org_node_closure WHERE ancestor_id = ${w.bind(filters.unitId)})`);
    return this.ds.query(sql`${WRITER_SELECT} WHERE ${w.clause} ORDER BY w.added_at, w.user_id`, w.values);
  }

  async writerOf(channelId: string, userId: string): Promise<WriterRow | null> {
    const rows: WriterRow[] = await this.ds.query(sql`${WRITER_SELECT} WHERE w.channel_id = $1 AND w.user_id = $2`, [channelId, userId]);
    return rows[0] ?? null;
  }

  async insertWriter(channelId: string, userId: string, tx: TransactionContext): Promise<boolean> {
    const result = await this.m(tx).createQueryBuilder().insert().into(NoticeChannelWriter).values({ channelId, userId }).orIgnore().returning('id').execute();
    return (result.raw as unknown[]).length === 1;
  }

  async removeWriter(channelId: string, userId: string, tx: TransactionContext): Promise<boolean> {
    return ((await this.m(tx).delete(NoticeChannelWriter, { channelId, userId })).affected ?? 0) > 0;
  }

  candidates(channelId: string, scope: PeopleScope, search: string | undefined): Promise<CandidateRow[]> {
    const w = new Where();
    const channel = w.bind(channelId);
    w.add('e.deleted_at IS NULL').add('u.is_active');
    w.add(`NOT EXISTS (SELECT 1 FROM notice_channel_writers x WHERE x.channel_id = ${channel} AND x.user_id = e.user_id)`);
    w.add(unitScopeSql(scope, { unit: 'e.org_node_id', company: 'e.company_id' }, w));
    w.search(['e.full_name'], search ? likeContains(search) : undefined);
    return this.ds.query(
      `SELECT e.id AS "employeeId", e.user_id AS "userId", e.full_name AS name, ${PERSON_COLUMNS}, ${HAS_NO_APPROVER} AS "hasNoApprover"
       FROM employees e JOIN users u ON u.id = e.user_id WHERE ${w.clause} ORDER BY e.full_name LIMIT 20`,
      w.values,
    );
  }

  async employee(employeeId: string): Promise<EmployeeFacts | null> {
    const rows: EmployeeFacts[] = await this.ds.query(
      `SELECT e.id AS "employeeId", e.user_id AS "userId", (u.id IS NOT NULL AND u.is_active) AS "isActive", e.full_name AS name, e.org_node_id AS "orgNodeId", e.company_id AS "companyId"
       FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [employeeId],
    );
    return rows[0] ?? null;
  }

  async channelRows(code?: string): Promise<ChannelRow[]> {
    return this.ds.query(
      `SELECT c.id, c.code, c.name_ar AS "nameAr", c.name_en AS "nameEn", c.org_node_id AS "unitId", n.company_id AS "unitCompanyId", c.is_active AS "isActive", c.writer_role_id AS "writerRoleId",
         ${NODE_NAME('ar')} AS "unitNameAr", ${NODE_NAME('en')} AS "unitNameEn", c.updated_at AS "updatedAt",
         (SELECT count(*)::int FROM notice_channel_writers w WHERE w.channel_id = c.id) AS "writersCount",
         (SELECT count(*)::int FROM notices x WHERE x.channel_id = c.id) AS "noticesCount"
       FROM notice_channels c LEFT JOIN org_nodes n ON n.id = c.org_node_id WHERE ($1::varchar IS NULL OR c.code = $1) ORDER BY c.created_at, c.code`,
      [code ?? null],
    );
  }

  async usedCodes(): Promise<Set<string>> {
    return new Set((await this.ds.manager.find(NoticeChannel, { select: { code: true } })).map((c) => c.code));
  }

  async nameTaken(nameAr: string, nameEn: string, exceptId?: string): Promise<boolean> {
    const rows: unknown[] = await this.ds.query(
      `SELECT 1 FROM notice_channels WHERE (lower(btrim(name_ar)) = lower(btrim($1)) OR lower(btrim(name_en)) = lower(btrim($2))) AND ($3::uuid IS NULL OR id <> $3) LIMIT 1`,
      [nameAr, nameEn, exceptId ?? null],
    );
    return rows.length > 0;
  }

  async unit(id: string): Promise<UnitFacts | null> {
    const rows: UnitFacts[] = await this.ds.query('SELECT id, company_id AS "companyId" FROM org_nodes WHERE id = $1 AND deleted_at IS NULL AND is_active', [id]);
    return rows[0] ?? null;
  }

  units(scope: PeopleScope, search: string | undefined): Promise<UnitOption[]> {
    const w = new Where();
    w.add('n.deleted_at IS NULL').add('n.is_active');
    w.add(unitScopeSql(scope, { unit: 'n.id', company: 'n.company_id' }, w));
    if (search) w.add(`EXISTS (SELECT 1 FROM org_node_translations x WHERE x.org_node_id = n.id AND x.name ILIKE ${w.bind(likeContains(search))})`);
    return this.ds.query(
      `SELECT n.id, n.parent_id AS "parentId", coalesce(${NODE_NAME('ar')}, ${NODE_NAME('en')}, '') AS "nameAr", coalesce(${NODE_NAME('en')}, ${NODE_NAME('ar')}, '') AS "nameEn", n.company_id AS "companyId"
       FROM org_nodes n WHERE ${w.clause} ORDER BY n.sort_order, n.id LIMIT 200`,
      w.values,
    );
  }

  async createChannel(input: NewChannel, tx: TransactionContext): Promise<NoticeChannel> {
    const m = this.m(tx);
    const role: { id: string }[] = await m.query(
      `INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule) VALUES ($1, $2, true, 'auto', 'notice_writer') RETURNING id`,
      [input.roleNameAr, input.roleNameEn],
    );
    const writerRoleId = role[0]?.id as string;
    await m.query(`INSERT INTO role_permissions (role_id, permission_key, scope) SELECT $1, k.key, 'own' FROM unnest($2::text[]) AS k(key)`, [writerRoleId, NOTICE_WRITER_ROLE_PERMISSIONS.map((p) => p.key)]);
    return m.save(m.create(NoticeChannel, { code: input.code, nameAr: input.nameAr, nameEn: input.nameEn, orgNodeId: input.unitId, writerRoleId, isActive: true }));
  }

  async renameChannel(channelId: string, names: { nameAr: string; nameEn: string; roleNameAr: string; roleNameEn: string }, tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    await m.update(NoticeChannel, { id: channelId }, { nameAr: names.nameAr, nameEn: names.nameEn });
    await m.query(`UPDATE roles SET name_ar = $2, name_en = $3, updated_at = now() WHERE id = (SELECT writer_role_id FROM notice_channels WHERE id = $1)`, [channelId, names.roleNameAr, names.roleNameEn]);
  }

  async setActive(channelId: string, isActive: boolean, tx: TransactionContext): Promise<void> {
    await this.m(tx).update(NoticeChannel, { id: channelId }, { isActive });
  }

  async revokeRoleFromWriters(channelId: string, roleId: string, tx: TransactionContext): Promise<string[]> {
    const rows: { user_id: string }[] = await this.m(tx).query(
      'DELETE FROM user_roles WHERE role_id = $2 AND user_id IN (SELECT user_id FROM notice_channel_writers WHERE channel_id = $1) RETURNING user_id',
      [channelId, roleId],
    );
    return rows.map((r) => r.user_id);
  }

  async grantRoleToWriters(channelId: string, roleId: string, grantedBy: string | null, tx: TransactionContext): Promise<string[]> {
    const rows: { user_id: string }[] = await this.m(tx).query(
      `INSERT INTO user_roles (user_id, role_id, granted_by) SELECT w.user_id, $2, $3 FROM notice_channel_writers w JOIN users u ON u.id = w.user_id AND u.is_active WHERE w.channel_id = $1
       ON CONFLICT (user_id, role_id) DO NOTHING RETURNING user_id`,
      [channelId, roleId, grantedBy],
    );
    return rows.map((r) => r.user_id);
  }

  async hasNotices(channelId: string): Promise<boolean> {
    return (await this.ds.manager.count(Notice, { where: { channelId } })) > 0;
  }

  async deleteChannel(channel: { id: string; writerRoleId: string }, tx: TransactionContext): Promise<string[]> {
    const m = this.m(tx);
    const held: { user_id: string }[] = await m.query('DELETE FROM user_roles WHERE role_id = $1 RETURNING user_id', [channel.writerRoleId]);
    await m.delete(NoticeChannel, { id: channel.id });
    await m.query('DELETE FROM role_permissions WHERE role_id = $1', [channel.writerRoleId]);
    await m.query('DELETE FROM roles WHERE id = $1', [channel.writerRoleId]);
    return held.map((r) => r.user_id);
  }

  /**
   * The first two channels exist only in an empty table (a real database gets them from the migration; a channel an administrator deleted stays deleted). Their units are
   * filled in whenever one is still missing, so a structure seeded after the channels is picked up.
   */
  async ensureSetup(): Promise<void> {
    await this.ds.transaction(async (m) => {
      const [{ count }] = (await m.query('SELECT count(*)::int AS count FROM notice_channels')) as [{ count: number }];
      for (const seed of NOTICE_CHANNEL_SEEDS) {
        if (count === 0) await this.seedChannel(m, seed);
        await m.query(
          `UPDATE notice_channels SET org_node_id = (SELECT n.id FROM org_nodes n JOIN org_node_translations t ON t.org_node_id = n.id WHERE n.deleted_at IS NULL AND t.name = ANY($2::text[]) ORDER BY array_position($2::text[], t.name), n.sort_order, n.id LIMIT 1)
           WHERE code = $1 AND org_node_id IS NULL`,
          [seed.code, seed.unitNames],
        );
      }
    });
  }

  private async seedChannel(m: EntityManager, seed: NoticeChannelSeed): Promise<void> {
    await m.query(`INSERT INTO roles (name_ar, name_en, is_system, assignment, auto_rule) SELECT $1::varchar, $2::varchar, true, 'auto', 'notice_writer' WHERE NOT EXISTS (SELECT 1 FROM roles WHERE auto_rule = 'notice_writer' AND name_en = $2)`, [seed.roleNameAr, seed.roleNameEn]);
    await m.query(
      `INSERT INTO role_permissions (role_id, permission_key, scope) SELECT r.id, k.key, 'own' FROM roles r CROSS JOIN unnest($2::text[]) AS k(key)
       WHERE r.auto_rule = 'notice_writer' AND r.name_en = $1 AND NOT EXISTS (SELECT 1 FROM role_permissions p WHERE p.role_id = r.id AND p.permission_key = k.key)`,
      [seed.roleNameEn, NOTICE_WRITER_ROLE_PERMISSIONS.map((p) => p.key)],
    );
    await m.query(
      `INSERT INTO notice_channels (code, name_ar, name_en, writer_role_id, is_active) SELECT $1::varchar, $2::varchar, $3::varchar, r.id, true FROM roles r WHERE r.auto_rule = 'notice_writer' AND r.name_en = $4 ON CONFLICT (code) DO NOTHING`,
      [seed.code, seed.nameAr, seed.nameEn, seed.roleNameEn],
    );
  }
}
