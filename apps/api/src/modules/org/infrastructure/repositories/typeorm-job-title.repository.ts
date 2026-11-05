import { Injectable } from '@nestjs/common';
import type { TitleTrack } from '@arweqah-platform/shared';
import { DataSource, type EntityManager } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { insertRow } from '../../../../common/infrastructure/insert-row';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { joinNames, saveNames, selectNames } from '../../../../common/infrastructure/translations';
import { JobTitleRepository, type NewTitleValues, type TitleLink, type TitleListFilter, type TitleListRow } from '../../domain/contracts/job-title.repository';
import { DevelopmentStageRule } from '../../domain/entities/org.entities';
import type { DevelopmentStageCode, DevelopmentStageRule as StageRule } from '../../domain/rules/development-stage.rules';
import type { KnownTitle } from '../../domain/rules/title-import.rules';
import type { TitleContent, TitleDetail, TitleView } from '../../domain/types/org.types';

const TITLE_COLUMNS = {
  id: 'j.id',
  orgNodeId: 'j.org_node_id',
  isActive: 'j.is_active',
  code: 'j.code',
  grade: 'j.grade',
  track: 'j.track',
  reportsToTitleId: 'j.reports_to_title_id',
  contentVersion: 'j.content_version',
};

@Injectable()
export class TypeOrmJobTitleRepository extends JobTitleRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  private titleQuery(): ReturnType<EntityManager['createQueryBuilder']> {
    const qb = this.ds.createQueryBuilder().from('job_titles', 'j').where('j.deleted_at IS NULL');
    joinNames(qb, { parentAlias: 'j', table: 'job_title_translations', foreignKey: 'job_title_id' });
    const columns = Object.entries(TITLE_COLUMNS);
    qb.select(columns[0]?.[1] as string, columns[0]?.[0] as string);
    for (const [alias, column] of columns.slice(1)) qb.addSelect(column, alias);
    return selectNames(qb, 'j');
  }

  async list(filter: TitleListFilter): Promise<TitleListRow[]> {
    if (filter.visibleNodeIds && !filter.visibleNodeIds.length) return [];
    const qb = this.titleQuery().innerJoin('org_nodes', 'n', 'n.id = j.org_node_id AND n.deleted_at IS NULL');
    joinNames(qb, { parentAlias: 'n', alias: 'u', table: 'org_node_translations', foreignKey: 'org_node_id' });
    qb.addSelect('n.code', 'unitCode').addSelect('u_ar.name', 'unitNameAr').addSelect('COALESCE(u_en.name, u_ar.name)', 'unitNameEn');
    this.applyFilter(qb, filter);
    return qb.orderBy('j.code', 'ASC', 'NULLS LAST').addOrderBy('j_ar.name', 'ASC').addOrderBy('j.id', 'ASC').getRawMany<TitleListRow>();
  }

  /** Plain filters: the visible units, the ancestor units, grade, track and a search on both names and the code. */
  private applyFilter(qb: ReturnType<EntityManager['createQueryBuilder']>, filter: TitleListFilter): void {
    if (filter.visibleNodeIds) qb.andWhere('j.org_node_id IN (:...visible)', { visible: filter.visibleNodeIds });
    filter.ancestorIds.forEach((id, i) => {
      qb.andWhere(`EXISTS (SELECT 1 FROM org_node_closure c WHERE c.descendant_id = j.org_node_id AND c.ancestor_id = :ancestor${i})`, { [`ancestor${i}`]: id });
    });
    if (filter.grade !== undefined) qb.andWhere('j.grade = :grade', { grade: filter.grade });
    if (filter.track) qb.andWhere('j.track = :track', { track: filter.track });
    if (filter.search) qb.andWhere('(j_ar.name ILIKE :q OR j_en.name ILIKE :q OR j.code ILIKE :q)', { q: likeContains(filter.search) });
  }

  async detail(id: string): Promise<TitleDetail | null> {
    const row = await this.titleQuery()
      .addSelect('j.responsibilities', 'responsibilities')
      .addSelect('j.qualifications', 'qualifications')
      .addSelect('j.kpis', 'kpis')
      .andWhere('j.id = :id', { id })
      .getRawOne<TitleDetail>();
    return row ?? null;
  }

  async setContent(id: string, content: TitleContent, tx: TransactionContext): Promise<number> {
    const m = this.m(tx);
    await m.query(
      'UPDATE job_titles SET responsibilities = $2::jsonb, qualifications = $3::jsonb, kpis = $4::jsonb, content_version = content_version + 1, updated_at = now() WHERE id = $1',
      [id, JSON.stringify(content.responsibilities), JSON.stringify(content.qualifications), JSON.stringify(content.kpis)],
    );
    const rows: { v: number }[] = await m.query('SELECT content_version AS v FROM job_titles WHERE id = $1', [id]);
    return rows[0]?.v ?? 1;
  }

  async lockCodes(tx: TransactionContext): Promise<void> {
    await this.m(tx).query('SELECT pg_advisory_xact_lock(hashtext($1))', ['job-title-codes']);
  }

  async issuedCodes(tx?: TransactionContext): Promise<Set<string>> {
    const rows: { code: string }[] = await this.m(tx).query('SELECT code FROM job_titles WHERE code IS NOT NULL');
    return new Set(rows.map((r) => r.code));
  }

  async setGradeAndCode(id: string, values: { grade: number; track: TitleTrack; code: string | null }, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE job_titles SET grade = $2, track = $3, code = $4, updated_at = now() WHERE id = $1', [id, values.grade, values.track, values.code]);
  }

  async setCode(id: string, code: string, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE job_titles SET code = $2, updated_at = now() WHERE id = $1', [id, code]);
  }

  async setReportsTo(id: string, upId: string | null, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('UPDATE job_titles SET reports_to_title_id = $2, updated_at = now() WHERE id = $1', [id, upId]);
  }

  async uncodedOfNode(nodeId: string, tx: TransactionContext): Promise<TitleView[]> {
    const rows = await this.titleQueryIn(tx).andWhere('j.org_node_id = :nodeId AND j.code IS NULL AND j.grade IS NOT NULL', { nodeId }).orderBy('j.created_at').getRawMany<TitleView>();
    return rows;
  }

  private titleQueryIn(tx: TransactionContext): ReturnType<EntityManager['createQueryBuilder']> {
    const qb = this.m(tx).createQueryBuilder().from('job_titles', 'j').where('j.deleted_at IS NULL');
    joinNames(qb, { parentAlias: 'j', table: 'job_title_translations', foreignKey: 'job_title_id' });
    qb.select('j.id', 'id').addSelect('j.grade', 'grade').addSelect('j.track', 'track');
    return selectNames(qb, 'j');
  }

  async reportingLines(): Promise<TitleLink[]> {
    const rows: { id: string; up: string | null; node: string }[] = await this.ds.query('SELECT id, reports_to_title_id AS up, org_node_id AS node FROM job_titles WHERE deleted_at IS NULL');
    return rows.map((r) => ({ id: r.id, upId: r.up, nodeId: r.node }));
  }

  async insertTitles(nodeId: string, titles: NewTitleValues[], tx: TransactionContext): Promise<string[]> {
    const m = this.m(tx);
    const ids: string[] = [];
    for (const t of titles) {
      const id = await insertRow(m, 'job_titles', {
        org_node_id: nodeId,
        code: t.code,
        grade: t.grade,
        track: t.track,
        reports_to_title_id: t.reportsToTitleId,
        responsibilities: t.content.responsibilities,
        qualifications: t.content.qualifications,
        kpis: t.content.kpis,
      });
      await saveNames(m, { table: 'job_title_translations', foreignKey: 'job_title_id', parentId: id }, t);
      ids.push(id);
    }
    return ids;
  }

  async knownTitles(): Promise<KnownTitle[]> {
    const qb = this.ds.createQueryBuilder().from('job_titles', 'j').where('j.deleted_at IS NULL AND j.code IS NOT NULL');
    joinNames(qb, { parentAlias: 'j', table: 'job_title_translations', foreignKey: 'job_title_id' });
    qb.leftJoin('job_titles', 'up', 'up.id = j.reports_to_title_id AND up.deleted_at IS NULL')
      .select('j.id', 'id')
      .addSelect('j.code', 'code')
      .addSelect('j.grade', 'grade')
      .addSelect('j.track', 'track')
      .addSelect('up.code', 'reportsToCode')
      .addSelect('j.responsibilities', 'responsibilities')
      .addSelect('j.qualifications', 'qualifications')
      .addSelect('j.kpis', 'kpis');
    return selectNames(qb, 'j').getRawMany<KnownTitle>();
  }

  async stageRules(): Promise<StageRule[]> {
    const rows = await this.ds.getRepository(DevelopmentStageRule).find();
    return rows.map((r) => ({ grade: r.grade, track: r.track, stage: r.stage as DevelopmentStageCode }));
  }
}
