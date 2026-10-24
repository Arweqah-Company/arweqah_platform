import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { returnedRows } from '../../../../common/infrastructure/query-result';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { TaskMaintenanceRepository } from '../../domain/contracts/task-maintenance.repository';
import type { DigestRow, OpenWorkRow, TaskNoticeTarget } from '../../domain/types/task.types';

const TARGET = `t.id, t.number::text AS number, t.title, t.assignee_user_id AS "assigneeUserId", t.creator_user_id AS "creatorUserId"`;
/** Open and waiting for somebody to do something (a task still waiting for approval or already refused is not). */
const WORKING = `t.status IN ('todo', 'in_progress', 'awaiting_review')`;

const OVERDUE = `SELECT ${TARGET} FROM tasks t WHERE t.archived_at IS NULL AND ${WORKING} AND t.overdue_notified_at IS NULL AND t.due_date < $1::date`;

@Injectable()
export class TypeOrmTaskMaintenanceRepository extends TaskMaintenanceRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  dueForReminder(today: string): Promise<TaskNoticeTarget[]> {
    return this.ds.query(
      `SELECT ${TARGET} FROM tasks t LEFT JOIN task_policies p ON p.company_id = t.company_id
       WHERE t.archived_at IS NULL AND ${WORKING} AND t.reminded_at IS NULL
         AND t.due_date >= $1::date AND t.due_date <= $1::date + COALESCE(p.reminder_days_before, 1)`,
      [today],
    );
  }

  async markReminded(ids: string[]): Promise<void> {
    if (ids.length) await this.ds.query('UPDATE tasks SET reminded_at = now() WHERE id = ANY($1)', [ids]);
  }

  overdueUnnotified(today: string): Promise<TaskNoticeTarget[]> {
    return this.ds.query(OVERDUE, [today]);
  }

  async markOverdueNotified(ids: string[]): Promise<void> {
    if (ids.length) await this.ds.query('UPDATE tasks SET overdue_notified_at = now() WHERE id = ANY($1)', [ids]);
  }

  overdueDigest(today: string, weekday: number): Promise<DigestRow[]> {
    return this.ds.query(
      `SELECT mu.id AS "managerUserId", count(*)::int AS overdue
       FROM tasks t
       JOIN employees ae ON ae.user_id = t.assignee_user_id AND ae.deleted_at IS NULL
       JOIN employees m ON m.id = ae.manager_id AND m.deleted_at IS NULL
       JOIN users mu ON mu.id = m.user_id AND mu.is_active
       LEFT JOIN task_policies p ON p.company_id = t.company_id
       WHERE t.archived_at IS NULL AND ${WORKING} AND t.due_date < $1::date AND COALESCE(p.digest_weekday, 0) = $2
       GROUP BY mu.id`,
      [today, weekday],
    );
  }

  async archiveStale(now: Date, tx: TransactionContext): Promise<TaskNoticeTarget[]> {
    const result = await managerOf(tx, this.ds.manager).query(
      `UPDATE tasks t SET archived_at = now(), revision = t.revision + 1, updated_at = now()
       FROM (SELECT x.id FROM tasks x LEFT JOIN task_policies p ON p.company_id = x.company_id
             WHERE x.archived_at IS NULL AND x.source = 'standalone' AND x.project_id IS NULL AND x.ticket_id IS NULL AND x.status IN ('done', 'rejected')
               AND x.last_activity_at < $1::timestamptz - (COALESCE(p.standalone_retention_days, 30) * interval '1 day')) due
       WHERE t.id = due.id RETURNING ${TARGET}`,
      [now],
    );
    return returnedRows<TaskNoticeTarget>(result);
  }

  async claimEstimateNotice(taskId: string, tx: TransactionContext): Promise<boolean> {
    const result = await managerOf(tx, this.ds.manager).query('UPDATE tasks SET estimate_notified_at = now() WHERE id = $1 AND estimate_notified_at IS NULL RETURNING id', [taskId]);
    return returnedRows<{ id: string }>(result).length > 0;
  }

  async existsOccurrence(parentId: string, dueDate: string, tx: TransactionContext): Promise<boolean> {
    const rows: { yes: boolean }[] = await managerOf(tx, this.ds.manager).query('SELECT EXISTS (SELECT 1 FROM tasks WHERE recurrence_parent_id = $1 AND due_date = $2::date) AS yes', [parentId, dueDate]);
    return rows[0]?.yes ?? false;
  }

  openWorkOf(userId: string): Promise<OpenWorkRow[]> {
    return this.ds.query(
      `SELECT ${TARGET}, t.reviewer_user_id AS "reviewerUserId", t.status, t.revision, t.project_id AS "projectId"
       FROM tasks t WHERE t.archived_at IS NULL AND ${WORKING} AND (t.assignee_user_id = $1 OR t.reviewer_user_id = $1)`,
      [userId],
    );
  }

  async reportingManagerOf(userId: string): Promise<string | null> {
    const rows: { id: string }[] = await this.ds.query(
      `SELECT m.user_id AS id FROM employees e JOIN employees m ON m.id = e.manager_id AND m.deleted_at IS NULL JOIN users mu ON mu.id = m.user_id AND mu.is_active
       WHERE e.user_id = $1 AND e.deleted_at IS NULL`,
      [userId],
    );
    return rows[0]?.id ?? null;
  }
}
