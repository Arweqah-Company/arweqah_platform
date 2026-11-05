import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ROOT_PARENT, type ManagementMode } from '@arweqah-platform/shared';
import { DataSource, type EntityManager } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { insertRow } from '../../../../common/infrastructure/insert-row';
import { joinNames, saveNames, selectNames } from '../../../../common/infrastructure/translations';
import type { CompanyView, LevelView, Names, NodePath, NodeView, TitleView } from '../../domain/types/org.types';
import { OrgRepository, type LevelsWrite, type NewNode } from '../../domain/contracts/org.repository';
import type { ParentRules } from '../../domain/rules/org-unit-types.rules';

/** The slot an added type takes in a unit code (the unit slot). */
const ADDED_TYPE_CODE_SLOT = 4;

@Injectable()
export class TypeOrmOrgRepository extends OrgRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  // ---------------------------------------------------------------- companies
  private companyQuery(): ReturnType<EntityManager['createQueryBuilder']> {
    const qb = this.ds.createQueryBuilder().from('companies', 'c').where('c.deleted_at IS NULL');
    joinNames(qb, { parentAlias: 'c', table: 'company_translations', foreignKey: 'company_id' });
    selectNames(qb.select('c.id', 'id').addSelect('c.code', 'code').addSelect('c.is_active', 'isActive'), 'c');
    return qb;
  }

  companies(): Promise<CompanyView[]> {
    return this.companyQuery().orderBy('c.code').getRawMany<CompanyView>();
  }

  company(id: string): Promise<CompanyView | null> {
    return this.companyQuery().andWhere('c.id = :id', { id }).getRawOne<CompanyView>().then((r) => r ?? null);
  }

  async groupCompanyId(): Promise<string | null> {
    const rows: { id: string }[] = await this.ds.query(
      `SELECT id FROM companies WHERE deleted_at IS NULL ORDER BY (code = 'ARW') DESC, created_at, id LIMIT 1`,
    );
    return rows[0]?.id ?? null;
  }

  async companyCodeTaken(code: string, exceptId?: string): Promise<boolean> {
    const qb = this.ds.createQueryBuilder().select('1').from('companies', 'c').where('c.code = :code AND c.deleted_at IS NULL', { code });
    if (exceptId) qb.andWhere('c.id <> :exceptId', { exceptId });
    return !!(await qb.getRawOne());
  }

  async insertCompany(data: Names & { code: string; isActive: boolean }, tx: TransactionContext): Promise<string> {
    const id = await insertRow(this.m(tx), 'companies', { code: data.code, is_active: data.isActive });
    await saveNames(this.m(tx), { table: 'company_translations', foreignKey: 'company_id', parentId: id }, data);
    return id;
  }

  async updateCompany(id: string, data: Names & { code: string; isActive: boolean }, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE companies SET code = $2, is_active = $3, updated_at = now() WHERE id = $1', [id, data.code, data.isActive]);
    await saveNames(this.m(tx), { table: 'company_translations', foreignKey: 'company_id', parentId: id }, data);
  }

  async softDeleteCompany(id: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE companies SET deleted_at = now() WHERE id = $1', [id]);
  }

  async unitsCountOfCompany(companyId: string): Promise<number> {
    const rows: { n: string }[] = await this.ds.query('SELECT count(*) AS n FROM org_nodes WHERE company_id = $1 AND deleted_at IS NULL', [companyId]);
    return Number(rows[0]?.n ?? 0);
  }

  // ------------------------------------------------------------------- levels
  private levelQuery(): ReturnType<EntityManager['createQueryBuilder']> {
    const qb = this.ds.createQueryBuilder().from('org_levels', 'l').where('l.deleted_at IS NULL');
    joinNames(qb, { parentAlias: 'l', table: 'org_level_translations', foreignKey: 'org_level_id' });
    selectNames(
      qb
        .select('l.id', 'id')
        .addSelect('l.template_code', 'key')
        .addSelect('l.sort_order', 'sortOrder')
        .addSelect('l.is_assignable', 'isAssignable')
        .addSelect('l.is_built_in', 'isBuiltIn')
        .addSelect('l.tone', 'tone')
        .addSelect('l.code_slot', 'codeSlot'),
      'l',
    );
    return qb;
  }

  levels(): Promise<LevelView[]> {
    return this.levelQuery().orderBy('l.sort_order').getRawMany<LevelView>();
  }

  level(id: string): Promise<LevelView | null> {
    return this.levelQuery().andWhere('l.id = :id', { id }).getRawOne<LevelView>().then((r) => r ?? null);
  }

  async unitCountsByLevel(): Promise<Map<string, number>> {
    const rows: { id: string; n: string }[] = await this.ds.query('SELECT org_level_id AS id, count(*) AS n FROM org_nodes WHERE deleted_at IS NULL GROUP BY org_level_id');
    return new Map(rows.map((r) => [r.id, Number(r.n)]));
  }

  async levelRules(): Promise<ParentRules> {
    const rows: { parent: string; child: string }[] = await this.ds.query(
      `SELECT COALESCE(p.template_code, $1) AS parent, c.template_code AS child
       FROM org_level_parents r
       JOIN org_levels c ON c.id = r.child_level_id AND c.deleted_at IS NULL
       LEFT JOIN org_levels p ON p.id = r.parent_level_id
       WHERE r.parent_level_id IS NULL OR p.deleted_at IS NULL
       ORDER BY c.sort_order`,
      [ROOT_PARENT],
    );
    const rules: Record<string, string[]> = {};
    for (const row of rows) (rules[row.parent] ??= []).push(row.child);
    return rules;
  }

  async applyLevels(write: LevelsWrite, tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    if (write.removeIds.length) {
      await m.query('DELETE FROM org_level_parents WHERE parent_level_id = ANY($1) OR child_level_id = ANY($1)', [write.removeIds]);
      await m.query('UPDATE org_levels SET deleted_at = now() WHERE id = ANY($1)', [write.removeIds]);
    }
    for (const item of write.items) {
      const id = item.id ? await this.updateLevel(m, item.id, item) : await this.insertLevel(m, item);
      await saveNames(m, { table: 'org_level_translations', foreignKey: 'org_level_id', parentId: id }, item);
    }
  }

  /** An existing type keeps its key, order, tone and code slot; only the accepts-titles flag changes (the names are saved by the caller). */
  private async updateLevel(m: EntityManager, id: string, item: { isAssignable: boolean }): Promise<string> {
    await m.query('UPDATE org_levels SET is_assignable = $2, updated_at = now() WHERE id = $1', [id, item.isAssignable]);
    return id;
  }

  private insertLevel(m: EntityManager, item: { sortOrder: number; isAssignable: boolean }): Promise<string> {
    return insertRow(m, 'org_levels', {
      sort_order: item.sortOrder,
      is_assignable: item.isAssignable,
      template_code: `custom_${randomBytes(4).toString('hex')}`,
      is_built_in: false,
      tone: 'unit',
      code_slot: ADDED_TYPE_CODE_SLOT,
    });
  }

  async replaceLevelRules(rules: ParentRules, tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    const pairs = Object.entries(rules).flatMap(([parent, children]) => children.map((child) => [parent, child] as const));
    await m.query('DELETE FROM org_level_parents');
    if (!pairs.length) return;
    await m.query(
      `INSERT INTO org_level_parents (parent_level_id, child_level_id)
       SELECT p.id, c.id
       FROM unnest($1::text[], $2::text[]) AS r(parent_key, child_key)
       JOIN org_levels c ON c.template_code = r.child_key AND c.deleted_at IS NULL
       LEFT JOIN org_levels p ON p.template_code = r.parent_key AND p.deleted_at IS NULL
       WHERE r.parent_key = $3 OR p.id IS NOT NULL
       ON CONFLICT DO NOTHING`,
      [pairs.map(([parent]) => parent), pairs.map(([, child]) => child), ROOT_PARENT],
    );
  }

  // ------------------------------------------------------------------- units
  private nodeQuery(): ReturnType<EntityManager['createQueryBuilder']> {
    const qb = this.ds.createQueryBuilder().from('org_nodes', 'n').innerJoin('org_levels', 'lv', 'lv.id = n.org_level_id').where('n.deleted_at IS NULL');
    joinNames(qb, { parentAlias: 'n', table: 'org_node_translations', foreignKey: 'org_node_id' });
    selectNames(
      qb
        .select('n.id', 'id')
        .addSelect('n.company_id', 'companyId')
        .addSelect('n.org_level_id', 'levelId')
        .addSelect('lv.template_code', 'levelKey')
        .addSelect('n.code', 'code')
        .addSelect('n.management_mode', 'managementMode')
        .addSelect('n.parent_id', 'parentId')
        .addSelect('n.manager_id', 'managerId')
        .addSelect("to_char(n.start_date, 'YYYY-MM-DD')", 'startDate')
        .addSelect('n.is_active', 'isActive')
        .addSelect('n.sort_order', 'sortOrder')
        .addSelect('n.charter', 'charter'),
      'n',
    );
    return qb;
  }

  nodes(): Promise<NodeView[]> {
    return this.nodeQuery().orderBy('n.sort_order').addOrderBy('n.created_at').getRawMany<NodeView>();
  }

  node(id: string): Promise<NodeView | null> {
    return this.nodeQuery().andWhere('n.id = :id', { id }).getRawOne<NodeView>().then((r) => r ?? null);
  }

  nodesByIds(ids: string[]): Promise<NodeView[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.nodeQuery().andWhere('n.id IN (:...ids)', { ids }).getRawMany<NodeView>();
  }

  async insertNode(data: NewNode, tx: TransactionContext): Promise<string> {
    const m = this.m(tx);
    const id = await insertRow(m, 'org_nodes', {
      company_id: data.companyId,
      org_level_id: data.levelId,
      parent_id: data.parentId,
      manager_id: data.managerId,
      start_date: data.startDate,
      sort_order: data.sortOrder,
      code: data.code,
      management_mode: data.managementMode,
    });
    await saveNames(m, { table: 'org_node_translations', foreignKey: 'org_node_id', parentId: id }, data);
    await m.query(
      `INSERT INTO org_node_closure (ancestor_id, descendant_id, depth)
       SELECT ancestor_id, $1::uuid, depth + 1 FROM org_node_closure WHERE descendant_id = $2::uuid
       UNION ALL SELECT $1::uuid, $1::uuid, 0`,
      [id, data.parentId],
    );
    return id;
  }

  async updateNode(id: string, data: Names & { managerId: string | null; startDate: string; isActive: boolean }, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE org_nodes SET manager_id = $2, start_date = $3, is_active = $4, updated_at = now() WHERE id = $1', [id, data.managerId, data.startDate, data.isActive]);
    await saveNames(this.m(tx), { table: 'org_node_translations', foreignKey: 'org_node_id', parentId: id }, data);
  }

  async moveNode(id: string, parentId: string | null, tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    await m.query(
      `DELETE FROM org_node_closure
       WHERE descendant_id IN (SELECT descendant_id FROM org_node_closure WHERE ancestor_id = $1)
         AND ancestor_id IN (SELECT ancestor_id FROM org_node_closure WHERE descendant_id = $1 AND ancestor_id <> $1)`,
      [id],
    );
    if (parentId) {
      await m.query(
        `INSERT INTO org_node_closure (ancestor_id, descendant_id, depth)
         SELECT sup.ancestor_id, sub.descendant_id, sup.depth + sub.depth + 1
         FROM org_node_closure sup CROSS JOIN org_node_closure sub
         WHERE sup.descendant_id = $2 AND sub.ancestor_id = $1`,
        [id, parentId],
      );
    }
    await m.query('UPDATE org_nodes SET parent_id = $2, updated_at = now() WHERE id = $1', [id, parentId]);
  }

  async softDeleteNodes(ids: string[], tx: TransactionContext): Promise<void> {
    if (ids.length) await this.m(tx).query('UPDATE org_nodes SET deleted_at = now() WHERE id = ANY($1)', [ids]);
  }

  async setNodeMode(id: string, mode: ManagementMode | null, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE org_nodes SET management_mode = $2, updated_at = now() WHERE id = $1', [id, mode]);
  }

  async setNodeCode(id: string, code: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE org_nodes SET code = $2, updated_at = now() WHERE id = $1', [id, code]);
  }

  async effectiveModesOf(nodeIds: string[]): Promise<Map<string, ManagementMode>> {
    if (!nodeIds.length) return new Map();
    const rows: { id: string; mode: ManagementMode }[] = await this.ds.query(
      `SELECT n.id, COALESCE(
         (SELECT a.management_mode FROM org_node_closure c JOIN org_nodes a ON a.id = c.ancestor_id AND a.deleted_at IS NULL
          WHERE c.descendant_id = n.id AND a.management_mode IS NOT NULL ORDER BY c.depth LIMIT 1), 'per_company') AS mode
       FROM org_nodes n WHERE n.id = ANY($1)`,
      [nodeIds],
    );
    return new Map(rows.map((r) => [r.id, r.mode]));
  }

  async lockChildren(parentId: string | null, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('SELECT pg_advisory_xact_lock(hashtext($1))', [`org-children:${parentId ?? 'root'}`]);
  }

  async childCodes(parentId: string | null, tx: TransactionContext): Promise<string[]> {
    const rows: { code: string }[] = await this.m(tx).query(
      'SELECT code FROM org_nodes WHERE parent_id IS NOT DISTINCT FROM $1::uuid AND code IS NOT NULL AND deleted_at IS NULL',
      [parentId],
    );
    return rows.map((r) => r.code);
  }

  async codeTaken(code: string, tx: TransactionContext): Promise<boolean> {
    const rows: unknown[] = await this.m(tx).query('SELECT 1 FROM org_nodes WHERE code = $1 AND deleted_at IS NULL', [code]);
    return rows.length > 0;
  }

  async childrenCount(nodeId: string): Promise<number> {
    const rows: { n: string }[] = await this.ds.query('SELECT count(*) AS n FROM org_nodes WHERE parent_id = $1 AND deleted_at IS NULL', [nodeId]);
    return Number(rows[0]?.n ?? 0);
  }

  async descendantIds(nodeIds: string[]): Promise<string[]> {
    if (!nodeIds.length) return [];
    const rows: { id: string }[] = await this.ds.query(
      `SELECT DISTINCT c.descendant_id AS id FROM org_node_closure c
       JOIN org_nodes n ON n.id = c.descendant_id AND n.deleted_at IS NULL
       WHERE c.ancestor_id = ANY($1)`,
      [nodeIds],
    );
    return rows.map((r) => r.id);
  }

  async pathsOf(nodeIds: string[]): Promise<Map<string, NodePath>> {
    if (!nodeIds.length) return new Map();
    const rows: { id: string; pathAr: string; pathEn: string }[] = await this.ds.query(
      `SELECT c.descendant_id AS id,
              string_agg(COALESCE(ta.name, ''), ' › ' ORDER BY c.depth DESC) AS "pathAr",
              string_agg(COALESCE(te.name, ta.name, ''), ' › ' ORDER BY c.depth DESC) AS "pathEn"
       FROM org_node_closure c
       LEFT JOIN org_node_translations ta ON ta.org_node_id = c.ancestor_id AND ta.lang = 'ar'
       LEFT JOIN org_node_translations te ON te.org_node_id = c.ancestor_id AND te.lang = 'en'
       WHERE c.descendant_id = ANY($1) GROUP BY c.descendant_id`,
      [nodeIds],
    );
    return new Map(rows.map((r) => [r.id, { pathAr: r.pathAr, pathEn: r.pathEn }]));
  }

  // -------------------------------------------------------------- job titles
  private titleQuery(): ReturnType<EntityManager['createQueryBuilder']> {
    const qb = this.ds.createQueryBuilder().from('job_titles', 'j').where('j.deleted_at IS NULL');
    joinNames(qb, { parentAlias: 'j', table: 'job_title_translations', foreignKey: 'job_title_id' });
    selectNames(
      qb
        .select('j.id', 'id')
        .addSelect('j.org_node_id', 'orgNodeId')
        .addSelect('j.is_active', 'isActive')
        .addSelect('j.code', 'code')
        .addSelect('j.grade', 'grade')
        .addSelect('j.track', 'track')
        .addSelect('j.reports_to_title_id', 'reportsToTitleId')
        .addSelect('j.content_version', 'contentVersion'),
      'j',
    );
    return qb;
  }

  titlesOfNodes(nodeIds: string[]): Promise<TitleView[]> {
    if (!nodeIds.length) return Promise.resolve([]);
    return this.titleQuery().andWhere('j.org_node_id IN (:...nodeIds)', { nodeIds }).orderBy('j.created_at').getRawMany<TitleView>();
  }

  title(id: string): Promise<TitleView | null> {
    return this.titleQuery().andWhere('j.id = :id', { id }).getRawOne<TitleView>().then((r) => r ?? null);
  }

  titlesByIds(ids: string[]): Promise<TitleView[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.titleQuery().andWhere('j.id IN (:...ids)', { ids }).getRawMany<TitleView>();
  }

  async updateTitle(id: string, data: Names & { isActive: boolean }, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE job_titles SET is_active = $2, updated_at = now() WHERE id = $1', [id, data.isActive]);
    await saveNames(this.m(tx), { table: 'job_title_translations', foreignKey: 'job_title_id', parentId: id }, data);
  }

  async softDeleteTitles(ids: string[], tx: TransactionContext): Promise<void> {
    if (!ids.length) return;
    await this.m(tx).query('UPDATE job_titles SET deleted_at = now() WHERE id = ANY($1)', [ids]);
    // Titles that reported to a removed title no longer do (their manager is then looked for further up, or nowhere).
    await this.m(tx).query('UPDATE job_titles SET reports_to_title_id = NULL WHERE reports_to_title_id = ANY($1)', [ids]);
  }

  async activeTitleCount(nodeId: string): Promise<number> {
    const rows: { n: string }[] = await this.ds.query('SELECT count(*) AS n FROM job_titles WHERE org_node_id = $1 AND is_active AND deleted_at IS NULL', [nodeId]);
    return Number(rows[0]?.n ?? 0);
  }
}
