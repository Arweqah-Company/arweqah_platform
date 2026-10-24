import type { PermissionScope } from '@arweqah-platform/shared';
import type { TaskViewer } from '../../domain/types/task.types';

/** The tables every task query reads; the viewer's user id is always `$1`. */
export const TASK_FROM = `FROM tasks t
  JOIN users au ON au.id = t.assignee_user_id
  LEFT JOIN employees ae ON ae.user_id = t.assignee_user_id AND ae.deleted_at IS NULL
  LEFT JOIN employees am ON am.id = ae.manager_id AND am.deleted_at IS NULL
  JOIN users cu ON cu.id = t.creator_user_id
  LEFT JOIN employees ce ON ce.user_id = t.creator_user_id AND ce.deleted_at IS NULL
  LEFT JOIN users ru ON ru.id = t.reviewer_user_id
  LEFT JOIN employees re ON re.user_id = t.reviewer_user_id AND re.deleted_at IS NULL
  LEFT JOIN users pu ON pu.id = t.approver_user_id
  LEFT JOIN employees pe ON pe.user_id = t.approver_user_id AND pe.deleted_at IS NULL
  LEFT JOIN task_tags tg ON tg.id = t.tag_id`;

const TASK_COLUMNS = `t.id, t.number::text AS number, t.company_id AS "companyId", t.title, t.description,
  t.assignee_user_id AS "assigneeUserId", COALESCE(ae.full_name, au.name) AS "assigneeName", ae.id AS "assigneeEmployeeId",
  ae.manager_id AS "assigneeManagerEmployeeId", am.user_id AS "assigneeManagerUserId", ae.org_node_id AS "assigneeOrgNodeId", ae.company_id AS "assigneeCompanyId",
  t.creator_user_id AS "creatorUserId", COALESCE(ce.full_name, cu.name) AS "creatorName",
  t.reviewer_user_id AS "reviewerUserId", COALESCE(re.full_name, ru.name) AS "reviewerName",
  t.approver_user_id AS "approverUserId", COALESCE(pe.full_name, pu.name) AS "approverName",
  t.status, t.priority, to_char(t.due_date, 'YYYY-MM-DD') AS "dueDate", t.estimate_minutes AS "estimateMinutes",
  t.tag_id AS "tagId", tg.name_ar AS "tagNameAr", tg.name_en AS "tagNameEn", tg.org_node_id AS "tagOrgNodeId", tg.is_active AS "tagIsActive",
  t.urgent_manual AS "urgentManual", t.needs_review AS "needsReview", t.recurrence, to_char(t.recurrence_end, 'YYYY-MM-DD') AS "recurrenceEnd",
  t.recurrence_parent_id AS "recurrenceParentId", t.source, t.project_id AS "projectId", t.ticket_id AS "ticketId",
  t.completed_at AS "completedAt", to_char(t.completed_on, 'YYYY-MM-DD') AS "completedOn", t.last_activity_at AS "lastActivityAt",
  t.archived_at AS "archivedAt", t.revision,
  (SELECT COALESCE(SUM(x.minutes), 0)::int FROM task_time_entries x WHERE x.task_id = t.id) AS "loggedMinutes",
  (SELECT COUNT(*)::int FROM task_followers f WHERE f.task_id = t.id) AS followers,
  EXISTS (SELECT 1 FROM task_followers f WHERE f.task_id = t.id AND f.user_id = $1) AS "isFollowing",
  EXISTS (SELECT 1 FROM task_objections o WHERE o.task_id = t.id AND o.status = 'open' AND o.expires_at > now()) AS "hasOpenObjection"`;

/** The select of one task row; `where` and `tail` are fixed SQL text, every value is a parameter. */
export const taskQuery = (where: string, tail = ''): string => `SELECT ${TASK_COLUMNS} ${TASK_FROM} WHERE ${where} ${tail}`;

export const STATUS_ORDER = `CASE t.status WHEN 'pending_approval' THEN 0 WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'awaiting_review' THEN 3 WHEN 'done' THEN 4 ELSE 5 END`;
export const PRIORITY_ORDER = `CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END`;
export const ASSIGNEE_NAME = 'COALESCE(ae.full_name, au.name)';

/**
 * SQL for "this person is inside what the scope reaches for the viewer" (the same rule as `inReach` in the domain, without the
 * viewer themselves): own = nobody else; unit = direct reports; unit and below = direct reports and the viewer's subtree;
 * company; all. `employee` is the alias of the person's employee row; values are added to `values` and numbered from the end.
 */
export function reachSql(scope: PermissionScope | null, viewer: TaskViewer, employee: string, values: unknown[]): string {
  if (!scope || scope === 'own') return 'FALSE';
  if (scope === 'all') return 'TRUE';
  const bind = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };
  if (scope === 'company') return viewer.companyId ? `${employee}.company_id = ${bind(viewer.companyId)}` : 'FALSE';
  const direct = viewer.employeeId ? `${employee}.manager_id = ${bind(viewer.employeeId)}` : 'FALSE';
  if (scope === 'unit') return direct;
  return `(${direct} OR ${employee}.org_node_id = ANY(${bind([...viewer.subtreeNodeIds])}))`;
}
