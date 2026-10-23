import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { insertRow } from '../../../../common/infrastructure/insert-row';
import { joinNames, saveNames, selectNames } from '../../../../common/infrastructure/translations';
import type { CompanyView, LevelView, Names, NodePath, NodeView, TitleView } from '../../domain/types/org.types';
import { OrgRepository, type LevelsWrite } from '../../domain/contracts/org.repository';

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
      qb.select('l.id', 'id').addSelect('l.company_id', 'companyId').addSelect('l.sort_order', 'sortOrder').addSelect('l.is_assignable', 'isAssignable').addSelect('l.template_code', 'templateCode'),
      'l',
    );
    return qb;
  }

  levels(companyId: string): Promise<LevelView[]> {
    return this.levelQuery().andWhere('l.company_id = :companyId', { companyId }).orderBy('l.sort_order').getRawMany<LevelView>();
  }

  level(id: string): Promise<LevelView | null> {
    return this.levelQuery().andWhere('l.id = :id', { id }).getRawOne<LevelView>().then((r) => r ?? null);
  }

  async unitCountsByLevel(companyId: string): Promise<Map<string, number>> {
    const rows: { id: string; n: string }[] = await this.ds.query(
      'SELECT org_level_id AS id, count(*) AS n FROM org_nodes WHERE company_id = $1 AND deleted_at IS NULL GROUP BY org_level_id',
      [companyId],
    );
    return new Map(rows.map((r) => [r.id, Number(r.n)]));
  }

  async applyLevels(companyId: string, write: LevelsWrite, tx: TransactionContext): Promise<void> {
    const m = this.m(tx);
    if (write.removeIds.length) await m.query('UPDATE org_levels SET deleted_at = now() WHERE id = ANY($1)', [write.removeIds]);
    // Move kept levels out of the way so the unique (company, order) index never collides while reordering.
    await m.query('UPDATE org_levels SET sort_order = sort_order + 1000 WHERE company_id = $1 AND deleted_at IS NULL', [companyId]);
    for (const item of write.items) {
      const id = item.id ? await this.updateLevel(m, item.id, item) : await this.insertLevel(m, companyId, item);
      await saveNames(m, { table: 'org_level_translations', foreignKey: 'org_level_id', parentId: id }, item);
    }
  }

  /** An existing level keeps its template code whatever is renamed or reordered. */
  private async updateLevel(m: EntityManager, id: string, item: { sortOrder: number; isAssignable: boolean }): Promise<string> {
    await m.query('UPDATE org_levels SET sort_order = $2, is_assignable = $3, updated_at = now() WHERE id = $1', [id, item.sortOrder, item.isAssignable]);
    return id;
  }

  private async insertLevel(m: EntityManager, companyId: string, item: { sortOrder: number; isAssignable: boolean; templateCode?: string | null }): Promise<string> {
    return insertRow(m, 'org_levels', { company_id: companyId, sort_order: item.sortOrder, is_assignable: item.isAssignable, template_code: item.templateCode ?? null });
  }

  async templateLevels(): Promise<(Names & { sortOrder: number; isAssignable: boolean; templateCode: string })[]> {
    const qb = this.ds.createQueryBuilder().from('org_level_templates', 't').where('t.is_active = true');
    joinNames(qb, { parentAlias: 't', table: 'org_level_template_translations', foreignKey: 'org_level_template_id' });
    selectNames(qb.select('t.sort_order', 'sortOrder').addSelect('t.is_assignable', 'isAssignable').addSelect('t.code', 'templateCode'), 't');
    return qb.orderBy('t.sort_order').getRawMany();
  }

  // ------------------------------------------------------------------- units
  private nodeQuery(): ReturnType<EntityManager['createQueryBuilder']> {
    const qb = this.ds.createQueryBuilder().from('org_nodes', 'n').where('n.deleted_at IS NULL');
    joinNames(qb, { parentAlias: 'n', table: 'org_node_translations', foreignKey: 'org_node_id' });
    selectNames(
      qb
        .select('n.id', 'id')
        .addSelect('n.company_id', 'companyId')
        .addSelect('n.org_level_id', 'levelId')
        .addSelect('n.parent_id', 'parentId')
        .addSelect('n.manager_id', 'managerId')
        .addSelect("to_char(n.start_date, 'YYYY-MM-DD')", 'startDate')
        .addSelect('n.is_active', 'isActive')
        .addSelect('n.sort_order', 'sortOrder'),
      'n',
    );
    return qb;
  }

  nodes(companyId: string): Promise<NodeView[]> {
    return this.nodeQuery().andWhere('n.company_id = :companyId', { companyId }).orderBy('n.sort_order').addOrderBy('n.created_at').getRawMany<NodeView>();
  }

  node(id: string): Promise<NodeView | null> {
    return this.nodeQuery().andWhere('n.id = :id', { id }).getRawOne<NodeView>().then((r) => r ?? null);
  }

  nodesByIds(ids: string[]): Promise<NodeView[]> {
    if (!ids.length) return Promise.resolve([]);
    return this.nodeQuery().andWhere('n.id IN (:...ids)', { ids }).getRawMany<NodeView>();
  }

  nodesOfLevels(levelIds: string[]): Promise<NodeView[]> {
    if (!levelIds.length) return Promise.resolve([]);
    return this.nodeQuery().andWhere('n.org_level_id IN (:...levelIds)', { levelIds }).getRawMany<NodeView>();
  }

  async insertNode(
    data: Names & { companyId: string; levelId: string; parentId: string | null; managerId: string | null; startDate: string; sortOrder: number },
    tx: TransactionContext,
  ): Promise<string> {
    const m = this.m(tx);
    const id = await insertRow(m, 'org_nodes', { company_id: data.companyId, org_level_id: data.levelId, parent_id: data.parentId, manager_id: data.managerId, start_date: data.startDate, sort_order: data.sortOrder });
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
    selectNames(qb.select('j.id', 'id').addSelect('j.org_node_id', 'orgNodeId').addSelect('j.is_active', 'isActive'), 'j');
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

  async insertTitles(nodeId: string, titles: Names[], tx: TransactionContext): Promise<string[]> {
    const m = this.m(tx);
    const ids: string[] = [];
    for (const names of titles) {
      const id = await insertRow(m, 'job_titles', { org_node_id: nodeId });
      await saveNames(m, { table: 'job_title_translations', foreignKey: 'job_title_id', parentId: id }, names);
      ids.push(id);
    }
    return ids;
  }

  async updateTitle(id: string, data: Names & { isActive: boolean }, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE job_titles SET is_active = $2, updated_at = now() WHERE id = $1', [id, data.isActive]);
    await saveNames(this.m(tx), { table: 'job_title_translations', foreignKey: 'job_title_id', parentId: id }, data);
  }

  async softDeleteTitles(ids: string[], tx: TransactionContext): Promise<void> {
    if (ids.length) await this.m(tx).query('UPDATE job_titles SET deleted_at = now() WHERE id = ANY($1)', [ids]);
  }

  async activeTitleCount(nodeId: string): Promise<number> {
    const rows: { n: string }[] = await this.ds.query('SELECT count(*) AS n FROM job_titles WHERE org_node_id = $1 AND is_active AND deleted_at IS NULL', [nodeId]);
    return Number(rows[0]?.n ?? 0);
  }
}
