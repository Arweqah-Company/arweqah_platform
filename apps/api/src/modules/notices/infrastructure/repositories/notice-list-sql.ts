import type { NoticeAckRateBand, NoticeManageState, NoticeManageTab, NoticeMineTab, NoticeMyState, NoticeSortKey } from '@arweqah-platform/shared';
import type { NoticeListViewer } from '../../domain/types/notice.types';
import { peopleScopeOf } from '../../domain/rules/notice-scope.rules';
import { unitScopeSql, Where } from './notice-sql';

const unitName = (lang: string, unit: string): string => `(SELECT x.name FROM org_node_translations x WHERE x.org_node_id = ${unit} AND x.lang = '${lang}')`;

/** The columns of a row of the manage list, the approvals list and the header of the details (the latest version is the one shown). */
export const LIST_SELECT = `
  SELECT n.id, c.code AS "channelCode", c.name_ar AS "channelNameAr", c.name_en AS "channelNameEn", n.kind, n.status,
    n.author_id AS "authorId", COALESCE(ae.full_name, au.name) AS "authorName", n.author_unit_id AS "authorUnitId",
    n.channel_id AS "channelId", un.company_id AS "unitCompanyId",
    ${unitName('ar', 'n.author_unit_id')} AS "unitNameAr", ${unitName('en', 'n.author_unit_id')} AS "unitNameEn",
    n.publish_on::text AS "publishOn", n.published_at AS "publishedAt", n.submitted_at AS "submittedAt", n.created_at AS "createdAt",
    n.is_pinned AS "isPinned", n.current_version AS "currentVersion", n.revision, v.version, v.title_ar AS "titleAr", v.title_en AS "titleEn",
    EXISTS (SELECT 1 FROM notice_audiences a WHERE a.notice_id = n.id AND a.version = v.version AND a.type = 'all') AS "audienceAll",
    (SELECT count(*)::int FROM notice_audiences a WHERE a.notice_id = n.id AND a.version = v.version) AS "audienceRules",
    rc.total AS recipients, rc.acked AS acknowledged`;

export const LIST_FROM = `
  FROM notices n
  JOIN notice_channels c ON c.id = n.channel_id
  JOIN LATERAL (SELECT version, title_ar, title_en, body FROM notice_versions WHERE notice_id = n.id ORDER BY version DESC LIMIT 1) v ON true
  JOIN users au ON au.id = n.author_id
  LEFT JOIN employees ae ON ae.user_id = au.id AND ae.deleted_at IS NULL
  LEFT JOIN org_nodes un ON un.id = n.author_unit_id
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS total, (count(*) FILTER (WHERE r.acknowledged_version >= n.current_version))::int AS acked FROM notice_recipients r WHERE r.notice_id = n.id
  ) rc ON true`;

const SORT_COLUMNS: Record<NoticeSortKey, string> = {
  publishedAt: 'n.published_at',
  publishOn: 'n.publish_on',
  title: 'v.title_ar',
  status: 'n.status',
  createdAt: 'n.created_at',
};

export const orderBy = (sort: NoticeSortKey, dir: 'asc' | 'desc'): string => `${SORT_COLUMNS[sort]} ${dir === 'asc' ? 'ASC' : 'DESC'} NULLS LAST, n.id`;

/** What the person sees of the manage list: their own notices, those of the channels they write in, and the ones written inside the unit-based scope of the key. */
export function manageScope(viewer: NoticeListViewer, where: Where): string {
  const parts = [`n.author_id = ${where.bind(viewer.userId)}`];
  if (viewer.writerChannelIds.length) parts.push(`n.channel_id = ANY(${where.bind(viewer.writerChannelIds)})`);
  parts.push(unitScopeSql(peopleScopeOf(viewer.scope), { unit: 'n.author_unit_id', company: 'un.company_id' }, where));
  return `(${parts.join(' OR ')})`;
}

/** The approvals: written inside the scope, never by the person, and waiting. */
export function approvalScope(viewer: NoticeListViewer, where: Where): string {
  return `(n.author_id <> ${where.bind(viewer.userId)} AND ${unitScopeSql(peopleScopeOf(viewer.scope), { unit: 'n.author_unit_id', company: 'un.company_id' }, where)})`;
}

/** A published notice with a new version being written, waiting for approval or rejected: employees do not see it. */
export const HIDDEN_FOR_REVISION = `(n.published_at IS NOT NULL AND n.status IN ('revising', 'pending_approval', 'rejected'))`;

export function tabSql(tab: NoticeManageTab, userId: string, where: Where): string {
  switch (tab) {
    case 'mine':
      return `(n.author_id = ${where.bind(userId)} AND n.status IN ('draft', 'rejected', 'revising'))`;
    case 'pending':
      return `n.status = 'pending_approval'`;
    case 'published':
      return `n.status = 'published'`;
    case 'archived':
      return `n.status = 'archived'`;
    default:
      return 'TRUE';
  }
}

const STATE_SQL: Record<NoticeManageState, string> = {
  draft: `n.status = 'draft'`,
  pending_approval: `n.status = 'pending_approval'`,
  scheduled: `n.status = 'approved'`,
  published: `n.status = 'published'`,
  revising: `(n.status = 'revising' OR (n.status IN ('pending_approval', 'rejected') AND n.published_at IS NOT NULL))`,
  rejected: `n.status = 'rejected'`,
  archived: `n.status = 'archived'`,
};

export const stateSql = (state: NoticeManageState): string => STATE_SQL[state];

const PUBLISHED_POLICY = `n.kind = 'policy' AND n.status = 'published' AND rc.total > 0`;
const ACK_RATE_SQL: Record<NoticeAckRateBand, string> = {
  below_50: `${PUBLISHED_POLICY} AND rc.acked * 2 < rc.total`,
  from_50: `${PUBLISHED_POLICY} AND rc.acked * 2 >= rc.total AND rc.acked < rc.total`,
  complete: `${PUBLISHED_POLICY} AND rc.acked = rc.total`,
};

export const ackRateSql = (band: NoticeAckRateBand): string => ACK_RATE_SQL[band];

/** The people «waiting» on a policy: the current version is not acknowledged yet. */
export const AWAITING = `(n.kind = 'policy' AND (r.acknowledged_version IS NULL OR r.acknowledged_version < n.current_version))`;
export const ACKNOWLEDGED = `(n.kind = 'policy' AND r.acknowledged_version >= n.current_version)`;
export const INFORMS = `n.kind = 'announcement'`;

export function myStateSql(state: NoticeMyState | NoticeMineTab | undefined): string {
  if (state === 'await') return AWAITING;
  if (state === 'done') return ACKNOWLEDGED;
  if (state === 'info') return INFORMS;
  return 'TRUE';
}
