import { Injectable } from '@nestjs/common';
import type { NoticeAudienceOptionsDto } from '@arweqah-platform/shared';
import { DataSource } from 'typeorm';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { NoticeDirectory, type RuleName } from '../../domain/contracts/notice-directory.port';
import type { AudienceRuleRow, UnitPlace } from '../../domain/types/notice.types';

const ids = (rows: { id: string }[]): Set<string> => new Set(rows.map((r) => r.id));

/** Read-only SQL over the org, employee, user and group tables (the same way the tickets and tasks directories read them). */
@Injectable()
export class TypeOrmNoticeDirectory extends NoticeDirectory {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async placeOf(userId: string): Promise<UnitPlace | null> {
    const rows: UnitPlace[] = await this.ds.query(`SELECT org_node_id AS "orgNodeId", company_id AS "companyId" FROM employees WHERE user_id = $1 AND deleted_at IS NULL`, [userId]);
    return rows[0] ?? null;
  }

  async approverFor(authorUserId: string, unitId: string | null): Promise<string | null> {
    if (!unitId) return null;
    const rows: { id: string }[] = await this.ds.query(
      `SELECT mu.id FROM org_node_closure c
       JOIN org_nodes a ON a.id = c.ancestor_id AND a.deleted_at IS NULL AND a.is_active
       JOIN employees m ON m.id = a.manager_id AND m.deleted_at IS NULL
       JOIN users mu ON mu.id = m.user_id AND mu.is_active
       WHERE c.descendant_id = $1 AND mu.id <> $2 ORDER BY c.depth ASC LIMIT 1`,
      [unitId, authorUserId],
    );
    return rows[0]?.id ?? null;
  }

  async existingRefs(wanted: { units: string[]; titles: string[]; groups: string[] }) {
    const [units, titles, groups]: { id: string }[][] = await Promise.all([
      this.ds.query('SELECT id FROM org_nodes WHERE id = ANY($1) AND deleted_at IS NULL', [wanted.units]),
      this.ds.query('SELECT id FROM job_titles WHERE id = ANY($1) AND deleted_at IS NULL', [wanted.titles]),
      this.ds.query('SELECT id FROM user_groups WHERE id = ANY($1)', [wanted.groups]),
    ]);
    return { units: ids(units ?? []), titles: ids(titles ?? []), groups: ids(groups ?? []) };
  }

  async audienceOptions(search: string | undefined): Promise<NoticeAudienceOptionsDto> {
    const like = search ? likeContains(search) : '%';
    const name = (table: string, fk: string, alias: string, lang: string) => `(SELECT x.name FROM ${table} x WHERE x.${fk} = ${alias}.id AND x.lang = '${lang}')`;
    const [units, titles, groups] = await Promise.all([
      this.ds.query(
        `SELECT n.id, n.parent_id AS "parentId", coalesce(${name('org_node_translations', 'org_node_id', 'n', 'ar')}, ${name('org_node_translations', 'org_node_id', 'n', 'en')}, '') AS "nameAr", coalesce(${name('org_node_translations', 'org_node_id', 'n', 'en')}, ${name('org_node_translations', 'org_node_id', 'n', 'ar')}, '') AS "nameEn"
         FROM org_nodes n WHERE n.deleted_at IS NULL AND n.is_active AND EXISTS (SELECT 1 FROM org_node_translations x WHERE x.org_node_id = n.id AND x.name ILIKE $1) ORDER BY n.sort_order, n.id`,
        [like],
      ),
      this.ds.query(
        `SELECT t.id, coalesce(${name('job_title_translations', 'job_title_id', 't', 'ar')}, ${name('job_title_translations', 'job_title_id', 't', 'en')}, '') AS "nameAr", coalesce(${name('job_title_translations', 'job_title_id', 't', 'en')}, ${name('job_title_translations', 'job_title_id', 't', 'ar')}, '') AS "nameEn",
                coalesce(${name('org_node_translations', 'org_node_id', 'n', 'ar')}, '') AS "unitNameAr", coalesce(${name('org_node_translations', 'org_node_id', 'n', 'en')}, '') AS "unitNameEn"
         FROM job_titles t JOIN org_nodes n ON n.id = t.org_node_id WHERE t.deleted_at IS NULL AND t.is_active AND EXISTS (SELECT 1 FROM job_title_translations x WHERE x.job_title_id = t.id AND x.name ILIKE $1) ORDER BY 2, t.id`,
        [like],
      ),
      this.ds.query(
        `SELECT g.id, g.name_ar AS "nameAr", g.name_en AS "nameEn", (SELECT count(*)::int FROM user_group_members m WHERE m.group_id = g.id) AS "memberCount"
         FROM user_groups g WHERE g.name_ar ILIKE $1 OR g.name_en ILIKE $1 ORDER BY g.name_ar, g.id`,
        [like],
      ),
    ]);
    return { units, titles, groups };
  }

  async ruleNames(rules: AudienceRuleRow[]): Promise<Map<string, RuleName>> {
    const of = (type: string) => rules.filter((r) => r.type === type && r.refId).map((r) => r.refId as string);
    const named = (type: string, rows: { id: string; nameAr: string | null; nameEn: string | null }[]): [string, RuleName][] =>
      rows.map((r) => [`${type}:${r.id}`, { type, refId: r.id, nameAr: r.nameAr ?? r.nameEn ?? '', nameEn: r.nameEn ?? r.nameAr ?? '' }]);
    const [units, titles, groups] = await Promise.all([
      this.ds.query(`SELECT n.id, (SELECT x.name FROM org_node_translations x WHERE x.org_node_id = n.id AND x.lang = 'ar') AS "nameAr", (SELECT x.name FROM org_node_translations x WHERE x.org_node_id = n.id AND x.lang = 'en') AS "nameEn" FROM org_nodes n WHERE n.id = ANY($1)`, [of('unit')]),
      this.ds.query(`SELECT t.id, (SELECT x.name FROM job_title_translations x WHERE x.job_title_id = t.id AND x.lang = 'ar') AS "nameAr", (SELECT x.name FROM job_title_translations x WHERE x.job_title_id = t.id AND x.lang = 'en') AS "nameEn" FROM job_titles t WHERE t.id = ANY($1)`, [of('title')]),
      this.ds.query(`SELECT g.id, g.name_ar AS "nameAr", g.name_en AS "nameEn" FROM user_groups g WHERE g.id = ANY($1)`, [of('people_group')]),
    ]);
    return new Map([...named('unit', units), ...named('title', titles), ...named('people_group', groups)]);
  }

  async names(userIds: string[]): Promise<Map<string, string>> {
    if (!userIds.length) return new Map();
    const rows: { id: string; name: string }[] = await this.ds.query('SELECT u.id, COALESCE(e.full_name, u.name) AS name FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = ANY($1)', [userIds]);
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  async activeUserIds(userIds: string[]): Promise<Set<string>> {
    if (!userIds.length) return new Set();
    return ids(await this.ds.query('SELECT id FROM users WHERE id = ANY($1) AND is_active', [userIds]));
  }
}
