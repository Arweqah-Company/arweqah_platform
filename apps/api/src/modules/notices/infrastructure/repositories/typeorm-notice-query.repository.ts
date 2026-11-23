import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { NoticeAckState, Paginated } from '@arweqah-platform/shared';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { NoticeQueryRepository } from '../../domain/contracts/notice-query.repository';
import type {
  AckFilters,
  AckRow,
  AckSummary,
  ApprovalsListFilters,
  FlowRow,
  ManageListFilters,
  MineListFilters,
  MineRow,
  NoticeListRow,
  NoticeListViewer,
  PersonRow,
} from '../../domain/types/notice.types';
import { ackRateSql, approvalScope, AWAITING, LIST_FROM, LIST_SELECT, manageScope, myStateSql, orderBy, stateSql, tabSql } from './notice-list-sql';
import { unitScopeSql, Where, sql } from './notice-sql';

const MINE_COLUMNS = `
  n.id, c.code AS "channelCode", c.name_ar AS "channelNameAr", c.name_en AS "channelNameEn", n.kind, n.status, v.title_ar AS "titleAr", v.title_en AS "titleEn", v.body,
  n.published_at AS "publishedAt", n.is_pinned AS "isPinned", n.current_version AS version, r.read_at AS "readAt", r.acknowledged_at AS "acknowledgedAt", r.acknowledged_version AS "acknowledgedVersion"`;

const MINE_FROM = `
  FROM notice_recipients r
  JOIN notices n ON n.id = r.notice_id
  JOIN notice_channels c ON c.id = n.channel_id
  JOIN notice_versions v ON v.notice_id = n.id AND v.version = n.current_version`;

/** The part of the report a state names; `version` binds the current version when the state needs it (a value no part of the query uses makes PostgreSQL fail). */
const ackStateSql = (state: NoticeAckState, version: () => string): string => {
  switch (state) {
    case 'acknowledged':
      return `r.acknowledged_version >= ${version()}`;
    case 'older_version':
      return `r.acknowledged_version IS NOT NULL AND r.acknowledged_version < ${version()}`;
    case 'pending':
      return 'r.acknowledged_version IS NULL AND NOT r.joined_after_publish';
    default:
      return 'r.acknowledged_version IS NULL AND r.joined_after_publish';
  }
};

const ACK_FROM = `
  FROM notice_recipients r JOIN users u ON u.id = r.user_id
  LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL`;

const PERSON_NAME = 'COALESCE(e.full_name, u.name)';

const countOf = (rows: { n: number }[]): number => rows[0]?.n ?? 0;

@Injectable()
export class TypeOrmNoticeQueryRepository extends NoticeQueryRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private async paged<T>(query: { select: string; from: string; order: string }, where: Where, page: { page: number; pageSize: number }): Promise<Paginated<T>> {
    const { select, from, order } = query;
    const total = countOf(await this.ds.query(sql`SELECT count(*)::int AS n ${from} WHERE ${where.clause}`, where.values));
    const paged = where.paged(page.page, page.pageSize);
    const items: T[] = await this.ds.query(sql`${select} ${from} WHERE ${where.clause} ORDER BY ${order} LIMIT ${paged.limit} OFFSET ${paged.offset}`, paged.values);
    return { items, total, page: page.page, pageSize: page.pageSize };
  }

  // ------------------------------------------------------------------ manage and approvals

  listManage(f: ManageListFilters): Promise<Paginated<NoticeListRow>> {
    const w = new Where();
    w.add(manageScope(f.viewer, w)).add(tabSql(f.tab, f.viewer.userId, w));
    if (f.state) w.add(stateSql(f.state));
    if (f.channelCode) w.add(`c.code = ${w.bind(f.channelCode)}`);
    w.eq('n.kind', f.kind).eq('n.author_id', f.authorId).eq('n.is_pinned', f.pinned);
    if (f.unitId) w.add(`n.author_unit_id IN (SELECT descendant_id FROM org_node_closure WHERE ancestor_id = ${w.bind(f.unitId)})`);
    if (f.ackRate) w.add(ackRateSql(f.ackRate));
    w.days('n.published_at', f.publishedFrom, f.publishedUntil);
    w.search(['v.title_ar', 'v.title_en', 'v.body', 'COALESCE(ae.full_name, au.name)'], f.search ? likeContains(f.search) : undefined);
    return this.paged({ select: LIST_SELECT, from: LIST_FROM, order: orderBy(f.sort, f.dir) }, w, f);
  }

  async manageCounts(viewer: NoticeListViewer): Promise<{ mine: number; pending: number }> {
    const count = async (tab: 'mine' | 'pending') => {
      const w = new Where();
      w.add(manageScope(viewer, w)).add(tabSql(tab, viewer.userId, w));
      return countOf(await this.ds.query(sql`SELECT count(*)::int AS n ${LIST_FROM} WHERE ${w.clause}`, w.values));
    };
    return { mine: await count('mine'), pending: await count('pending') };
  }

  listApprovals(f: ApprovalsListFilters): Promise<Paginated<NoticeListRow>> {
    const w = new Where().add(`n.status = 'pending_approval'`);
    w.add(approvalScope(f.viewer, w));
    if (f.channelCode) w.add(`c.code = ${w.bind(f.channelCode)}`);
    w.eq('n.kind', f.kind).eq('n.author_id', f.authorId).days('n.submitted_at', f.submittedFrom, f.submittedUntil);
    w.search(['v.title_ar', 'v.title_en', 'COALESCE(ae.full_name, au.name)'], f.search ? likeContains(f.search) : undefined);
    return this.paged({ select: LIST_SELECT, from: LIST_FROM, order: 'n.submitted_at ASC NULLS LAST, n.id' }, w, f);
  }

  async approvalsCount(viewer: NoticeListViewer): Promise<number> {
    const w = new Where().add(`n.status = 'pending_approval'`);
    w.add(approvalScope(viewer, w));
    return countOf(await this.ds.query(sql`SELECT count(*)::int AS n ${LIST_FROM} WHERE ${w.clause}`, w.values));
  }

  async headerOf(noticeId: string): Promise<NoticeListRow | null> {
    const rows: NoticeListRow[] = await this.ds.query(sql`${LIST_SELECT} ${LIST_FROM} WHERE n.id = $1`, [noticeId]);
    return rows[0] ?? null;
  }

  authors(viewer: NoticeListViewer): Promise<PersonRow[]> {
    const w = new Where();
    w.add(manageScope(viewer, w));
    return this.ds.query(sql`SELECT DISTINCT n.author_id AS id, COALESCE(ae.full_name, au.name) AS name ${LIST_FROM} WHERE ${w.clause} ORDER BY name`, w.values);
  }

  // ------------------------------------------------------------------ my notices

  async listMine(f: MineListFilters): Promise<Paginated<MineRow> & { awaiting: number }> {
    const w = new Where();
    w.add(`r.user_id = ${w.bind(f.userId)}`).add(`n.status = 'published'`);
    w.add(myStateSql(f.tab)).add(myStateSql(f.myState));
    if (f.channelCode) w.add(`c.code = ${w.bind(f.channelCode)}`);
    w.eq('n.kind', f.kind).eq('n.is_pinned', f.pinned).days('n.published_at', f.publishedFrom, f.publishedUntil);
    w.search(['v.title_ar', 'v.title_en', 'v.body'], f.search ? likeContains(f.search) : undefined);
    const page = await this.paged<MineRow>({ select: `SELECT ${MINE_COLUMNS}`, from: MINE_FROM, order: 'n.published_at DESC, n.id' }, w, f);
    return { ...page, awaiting: await this.awaitingCount(f.userId) };
  }

  private async awaitingCount(userId: string): Promise<number> {
    return countOf(await this.ds.query(sql`SELECT count(*)::int AS n ${MINE_FROM} WHERE r.user_id = $1 AND n.status = 'published' AND ${AWAITING}`, [userId]));
  }

  mineChannels(userId: string): Promise<{ code: string; nameAr: string; nameEn: string; isActive: boolean }[]> {
    return this.ds.query(
      `SELECT c.code, c.name_ar AS "nameAr", c.name_en AS "nameEn", c.is_active AS "isActive" FROM notice_channels c
       WHERE EXISTS (SELECT 1 FROM notice_recipients r JOIN notices n ON n.id = r.notice_id AND n.status IN ('published', 'archived') WHERE r.user_id = $1 AND n.channel_id = c.id)
       ORDER BY c.created_at, c.code`,
      [userId],
    );
  }

  async mineOne(userId: string, noticeId: string): Promise<MineRow | null> {
    const rows: MineRow[] = await this.ds.query(sql`SELECT ${MINE_COLUMNS} ${MINE_FROM} WHERE r.user_id = $1 AND n.id = $2 AND n.status IN ('published', 'archived')`, [userId, noticeId]);
    return rows[0] ?? null;
  }

  async home(userId: string) {
    const published = `r.user_id = $1 AND n.status = 'published'`;
    const [awaiting, newThisWeek, pinned, awaitingTop, drafts] = await Promise.all([
      this.awaitingCount(userId),
      this.ds.query(sql`SELECT count(*)::int AS n ${MINE_FROM} WHERE ${published} AND n.published_at >= now() - interval '7 days'`, [userId]),
      this.ds.query(sql`SELECT ${MINE_COLUMNS} ${MINE_FROM} WHERE ${published} AND n.is_pinned LIMIT 1`, [userId]),
      this.ds.query(sql`SELECT ${MINE_COLUMNS} ${MINE_FROM} WHERE ${published} AND ${AWAITING} ORDER BY n.published_at DESC, n.id LIMIT 3`, [userId]),
      this.ds.query(`SELECT count(*)::int AS n FROM notices WHERE author_id = $1 AND status IN ('draft', 'rejected', 'revising')`, [userId]),
    ]);
    return { awaiting, newThisWeek: countOf(newThisWeek), pinned: (pinned as MineRow[])[0] ?? null, awaitingTop: awaitingTop as MineRow[], drafts: countOf(drafts) };
  }

  // ------------------------------------------------------------------ the report of acknowledgements

  /** The people the report reaches: inside the unit scope of the person, when they have one. */
  private ackWhere(f: Pick<AckFilters, 'noticeId' | 'currentVersion' | 'unitScope'>): Where {
    const w = new Where();
    w.add(`r.notice_id = ${w.bind(f.noticeId)}`);
    if (f.unitScope) w.add(unitScopeSql(f.unitScope, { unit: 'e.org_node_id', company: 'e.company_id' }, w));
    return w;
  }

  acknowledgements(f: AckFilters): Promise<Paginated<AckRow>> {
    const w = this.ackWhere(f);
    if (f.state) w.add(ackStateSql(f.state, () => w.bind(f.currentVersion)));
    if (f.unitId) w.add(`e.org_node_id IN (SELECT descendant_id FROM org_node_closure WHERE ancestor_id = ${w.bind(f.unitId)})`);
    const unitNames = `(SELECT string_agg(x.name, ' ') FROM org_node_translations x WHERE x.org_node_id = e.org_node_id)`;
    w.search([PERSON_NAME, unitNames], f.search ? likeContains(f.search) : undefined);
    const select = `SELECT r.user_id AS "userId", ${PERSON_NAME} AS name, e.org_node_id AS "unitId",
      (SELECT x.name FROM org_node_translations x WHERE x.org_node_id = e.org_node_id AND x.lang = 'ar') AS "unitNameAr",
      (SELECT x.name FROM org_node_translations x WHERE x.org_node_id = e.org_node_id AND x.lang = 'en') AS "unitNameEn",
      r.delivered_at AS "deliveredAt", r.acknowledged_at AS "acknowledgedAt", r.acknowledged_version AS "acknowledgedVersion", r.joined_after_publish AS "joinedAfterPublish"`;
    return this.paged({ select, from: ACK_FROM, order: `${PERSON_NAME}, r.user_id` }, w, f);
  }

  async ackSummary(f: Pick<AckFilters, 'noticeId' | 'currentVersion' | 'unitScope'>): Promise<AckSummary & { pending: number }> {
    const w = this.ackWhere(f);
    const version = w.bind(f.currentVersion);
    const rows: { reached: number; acknowledged: number }[] = await this.ds.query(
      `SELECT count(*)::int AS reached, (count(*) FILTER (WHERE r.acknowledged_version >= ${version}))::int AS acknowledged ${ACK_FROM} WHERE ${w.clause}`,
      w.values,
    );
    const { reached = 0, acknowledged = 0 } = rows[0] ?? {};
    return { reached, acknowledged, pending: reached - acknowledged };
  }

  async joinedLater(noticeId: string): Promise<number> {
    return countOf(await this.ds.query(`SELECT count(*)::int AS n FROM notice_recipients WHERE notice_id = $1 AND joined_after_publish`, [noticeId]));
  }

  flow(noticeId: string): Promise<FlowRow[]> {
    return this.ds.query(
      `SELECT t.event, t.actor_id AS "actorId", t.comment, t.created_at AS "createdAt"
       FROM workflow_instances i JOIN workflow_transitions t ON t.instance_id = i.id
       WHERE i.entity_type = 'notice' AND i.entity_id = $1 ORDER BY t.created_at, (t.event = 'PUBLISH_DUE'), t.id`,
      [noticeId],
    );
  }
}
