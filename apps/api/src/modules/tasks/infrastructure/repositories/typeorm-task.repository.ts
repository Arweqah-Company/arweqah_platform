import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { Paginated, TaskGrouping, TaskSortKey } from '@arweqah-platform/shared';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { returnedRows } from '../../../../common/infrastructure/query-result';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TaskRepository } from '../../domain/contracts/task.repository';
import type { NewObjection, NewTask, NewTaskEvent, TaskEventRow, TaskListFilters, TaskObjectionRow, TaskPatch, TaskRow } from '../../domain/types/task.types';
import { ASSIGNEE_NAME, PRIORITY_ORDER, reachSql, STATUS_ORDER, TASK_FROM, taskQuery } from './task-sql';

const SORT_SQL: Record<TaskSortKey, string> = {
  title: 't.title',
  assignee: ASSIGNEE_NAME,
  dueDate: 't.due_date',
  priority: PRIORITY_ORDER,
  status: STATUS_ORDER,
  tag: 'tg.name_ar',
  estimate: 't.estimate_minutes',
};

const GROUP_SQL: Record<TaskGrouping, string> = { due: 't.due_date', status: STATUS_ORDER, person: ASSIGNEE_NAME };

/** Property of `TaskPatch` → column. Values are always bound parameters; only these fixed names reach the SQL text. */
const PATCH_COLUMNS: Record<keyof TaskPatch, string> = {
  title: 'title',
  description: 'description',
  assigneeUserId: 'assignee_user_id',
  reviewerUserId: 'reviewer_user_id',
  approverUserId: 'approver_user_id',
  status: 'status',
  priority: 'priority',
  dueDate: 'due_date',
  estimateMinutes: 'estimate_minutes',
  tagId: 'tag_id',
  urgentManual: 'urgent_manual',
  needsReview: 'needs_review',
  completedAt: 'completed_at',
  completedOn: 'completed_on',
  lastActivityAt: 'last_activity_at',
  archivedAt: 'archived_at',
  remindedAt: 'reminded_at',
  overdueNotifiedAt: 'overdue_notified_at',
  estimateNotifiedAt: 'estimate_notified_at',
};

const OPEN = `t.status NOT IN ('done', 'rejected')`;

@Injectable()
export class TypeOrmTaskRepository extends TaskRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private m(tx?: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }

  async insert(d: NewTask, tx: TransactionContext): Promise<string> {
    const rows: { id: string }[] = await this.m(tx).query(
      `INSERT INTO tasks (company_id, title, description, assignee_user_id, creator_user_id, reviewer_user_id, approver_user_id, status, priority, due_date,
         estimate_minutes, tag_id, urgent_manual, needs_review, recurrence, recurrence_end, recurrence_parent_id, source, ticket_id, project_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING id`,
      [d.companyId, d.title, d.description, d.assigneeUserId, d.creatorUserId, d.reviewerUserId, d.approverUserId, d.status, d.priority, d.dueDate,
        d.estimateMinutes, d.tagId, d.urgentManual, d.needsReview, d.recurrence, d.recurrenceEnd, d.recurrenceParentId, d.source, d.ticketId, d.projectId],
    );
    return rows[0]?.id as string;
  }

  async find(id: string, viewerUserId: string, tx?: TransactionContext): Promise<TaskRow | null> {
    const rows: TaskRow[] = await this.m(tx).query(taskQuery('t.id = $2'), [viewerUserId, id]);
    return rows[0] ?? null;
  }

  async patch(id: string, expectedRevision: number, patch: TaskPatch, tx: TransactionContext): Promise<boolean> {
    const sets = ['revision = revision + 1', 'updated_at = now()'];
    const values: unknown[] = [id, expectedRevision];
    for (const [key, value] of Object.entries(patch) as [keyof TaskPatch, unknown][]) {
      if (value === undefined) continue;
      values.push(value);
      sets.push(`${PATCH_COLUMNS[key]} = $${values.length}`);
    }
    const sql = `UPDATE tasks SET ${sets.join(', ')} WHERE id = $1 AND revision = $2 RETURNING id`;
    return returnedRows<{ id: string }>(await this.m(tx).query(sql, values)).length === 1;
  }

  /** The WHERE clause of a list (the viewer is $1) and its values. */
  private listWhere(f: Omit<TaskListFilters, 'page' | 'pageSize'>): { clause: string; values: unknown[] } {
    const values: unknown[] = [f.viewer.userId];
    const bind = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };
    const where: string[] = [this.tabSql(f, values), f.archived ? 't.archived_at IS NOT NULL' : 't.archived_at IS NULL'];
    if (f.status) where.push(`t.status = ${bind(f.status)}`);
    if (f.openOnly) where.push(OPEN);
    if (f.priority) where.push(`t.priority = ${bind(f.priority)}`);
    if (f.assigneeId) where.push(`t.assignee_user_id = ${bind(f.assigneeId)}`);
    if (f.tagId) where.push(`t.tag_id = ${bind(f.tagId)}`);
    if (f.overdue) where.push(`${OPEN} AND t.due_date < ${bind(f.today)}::date`);
    if (f.stale) where.push(`${OPEN} AND t.status <> 'pending_approval' AND t.last_activity_at < ${bind(f.now)}::timestamptz - (${bind(f.staleDays)}::int * interval '1 day')`);
    if (f.search) {
      const p = bind(likeContains(f.search));
      where.push(`(t.title ILIKE ${p} OR ('TSK-' || lpad(t.number::text, 6, '0')) ILIKE ${p})`);
    }
    return { clause: where.join(' AND '), values };
  }

  private tabSql(f: Omit<TaskListFilters, 'page' | 'pageSize'>, values: unknown[]): string {
    if (f.tab === 'assigned') return 't.assignee_user_id = $1';
    if (f.tab === 'created') return 't.creator_user_id = $1 AND t.assignee_user_id <> $1';
    if (f.tab === 'following') return `t.assignee_user_id <> $1 AND EXISTS (SELECT 1 FROM task_followers f WHERE f.task_id = t.id AND f.user_id = $1)`;
    const scope = f.teamKey ? (f.viewer.scopes[f.teamKey] ?? null) : null;
    if (f.reach === 'direct' && scope && scope !== 'own') {
      if (!f.viewer.employeeId) return 'FALSE';
      values.push(f.viewer.employeeId);
      return `t.assignee_user_id <> $1 AND ae.manager_id = $${values.length}`;
    }
    return `t.assignee_user_id <> $1 AND ${reachSql(scope, f.viewer, 'ae', values)}`;
  }

  async list(f: TaskListFilters): Promise<Paginated<TaskRow> & { groupBy: TaskGrouping | null }> {
    const { clause, values } = this.listWhere(f);
    const order = `${f.groupBy ? `${GROUP_SQL[f.groupBy]}, ` : ''}${SORT_SQL[f.sort]} ${f.dir === 'desc' ? 'DESC' : 'ASC'} NULLS LAST, t.id`;
    const page = [...values, f.pageSize, (f.page - 1) * f.pageSize];
    const listSql = taskQuery(clause, `ORDER BY ${order} LIMIT $${page.length - 1} OFFSET $${page.length}`);
    const countSql = `SELECT count(*)::int AS n ${TASK_FROM} WHERE ${clause}`;
    const [rows, count]: [TaskRow[], { n: number }[]] = await Promise.all([this.ds.query(listSql, page), this.ds.query(countSql, values)]);
    return { items: rows, total: count[0]?.n ?? 0, page: f.page, pageSize: f.pageSize, groupBy: f.groupBy ?? null };
  }

  listOpen(f: Omit<TaskListFilters, 'page' | 'pageSize'>, limit: number): Promise<TaskRow[]> {
    const { clause, values } = this.listWhere({ ...f, openOnly: true });
    return this.ds.query(taskQuery(clause, `ORDER BY t.due_date, t.id LIMIT ${Math.trunc(limit)}`), values);
  }

  async appendEvent(e: NewTaskEvent, tx: TransactionContext): Promise<void> {
    await this.m(tx).query(// clock_timestamp(), not now(): events written in one transaction keep the order they were written in
      'INSERT INTO task_events (task_id, type, actor_user_id, from_status, to_status, note, created_at) VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp())', [
      e.taskId, e.type, e.actorUserId, e.fromStatus ?? null, e.toStatus ?? null, e.note ?? null,
    ]);
  }

  events(taskId: string): Promise<TaskEventRow[]> {
    return this.ds.query(
      `SELECT ev.id, ev.type, ev.actor_user_id AS "actorUserId", COALESCE(e.full_name, u.name) AS "actorName", ev.from_status AS "fromStatus", ev.to_status AS "toStatus",
              ev.note, ev.created_at AS "createdAt"
       FROM task_events ev LEFT JOIN users u ON u.id = ev.actor_user_id LEFT JOIN employees e ON e.user_id = ev.actor_user_id AND e.deleted_at IS NULL
       WHERE ev.task_id = $1 ORDER BY ev.created_at, ev.id`,
      [taskId],
    );
  }

  async follow(taskId: string, userId: string, tx?: TransactionContext): Promise<void> {
    await this.m(tx).query('INSERT INTO task_followers (task_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [taskId, userId]);
  }

  async unfollow(taskId: string, userId: string, tx?: TransactionContext): Promise<void> {
    await this.m(tx).query('DELETE FROM task_followers WHERE task_id = $1 AND user_id = $2', [taskId, userId]);
  }

  async followerIds(taskId: string): Promise<string[]> {
    const rows: { user_id: string }[] = await this.ds.query('SELECT user_id FROM task_followers WHERE task_id = $1', [taskId]);
    return rows.map((r) => r.user_id);
  }

  async addTime(entry: { taskId: string; userId: string; minutes: number; workedOn: string }, tx: TransactionContext): Promise<void> {
    await this.m(tx).query('INSERT INTO task_time_entries (task_id, user_id, minutes, worked_on) VALUES ($1, $2, $3, $4)', [entry.taskId, entry.userId, entry.minutes, entry.workedOn]);
  }

  async loggedMinutes(taskId: string, tx?: TransactionContext): Promise<number> {
    const rows: { n: number }[] = await this.m(tx).query('SELECT COALESCE(SUM(minutes), 0)::int AS n FROM task_time_entries WHERE task_id = $1', [taskId]);
    return rows[0]?.n ?? 0;
  }

  async openObjection(taskId: string, tx?: TransactionContext): Promise<TaskObjectionRow | null> {
    const rows: TaskObjectionRow[] = await this.m(tx).query(
      `SELECT o.id, o.task_id AS "taskId", o.reason_code AS reason, o.note, o.status, o.raised_by_user_id AS "raisedByUserId",
              COALESCE(e.full_name, u.name) AS "raisedByName", o.expires_at AS "expiresAt"
       FROM task_objections o JOIN users u ON u.id = o.raised_by_user_id LEFT JOIN employees e ON e.user_id = o.raised_by_user_id AND e.deleted_at IS NULL
       WHERE o.task_id = $1 AND o.status = 'open' ORDER BY o.created_at DESC LIMIT 1`,
      [taskId],
    );
    return rows[0] ?? null;
  }

  async insertObjection(o: NewObjection, tx: TransactionContext): Promise<string> {
    const rows: { id: string }[] = await this.m(tx).query(
      'INSERT INTO task_objections (task_id, raised_by_user_id, reason_code, note, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [o.taskId, o.raisedByUserId, o.reason, o.note, o.expiresAt],
    );
    return rows[0]?.id as string;
  }

  async answerObjection(id: string, status: 'accepted' | 'rejected' | 'expired', answeredBy: string | null, tx: TransactionContext): Promise<boolean> {
    const result = await this.m(tx).query(`UPDATE task_objections SET status = $2, answered_by_user_id = $3 WHERE id = $1 AND status = 'open' RETURNING id`, [id, status, answeredBy]);
    return returnedRows<{ id: string }>(result).length === 1;
  }
}
