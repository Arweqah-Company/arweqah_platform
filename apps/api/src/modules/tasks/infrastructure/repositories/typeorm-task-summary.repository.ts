import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { PermissionScope } from '@arweqah-platform/shared';
import { MyTaskCounts, TaskSummaryRepository, TeamTaskCounts } from '../../domain/contracts/task-summary.repository';
import type { TaskViewer } from '../../domain/types/task.types';
import { reachSql } from './task-sql';

const OPEN = `t.status NOT IN ('done', 'rejected')`;
const RECENT = `t.status = 'done' AND t.completed_at >= $3::timestamptz - interval '30 days'`;

@Injectable()
export class TypeOrmTaskSummaryRepository extends TaskSummaryRepository {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async mine(userId: string, today: string, now: Date, soonDays: number): Promise<MyTaskCounts> {
    const rows: MyTaskCounts[] = await this.ds.query(
      `SELECT count(*) FILTER (WHERE ${OPEN})::int AS open,
              count(*) FILTER (WHERE ${OPEN} AND t.due_date < $2::date)::int AS overdue,
              count(*) FILTER (WHERE ${OPEN} AND t.due_date >= $2::date AND t.due_date <= $2::date + $4::int)::int AS "dueSoon",
              count(*) FILTER (WHERE ${RECENT})::int AS "doneRecently",
              count(*) FILTER (WHERE ${RECENT} AND COALESCE(t.completed_on, t.completed_at::date) <= t.due_date)::int AS "doneOnTime"
       FROM tasks t WHERE t.assignee_user_id = $1 AND t.archived_at IS NULL`,
      [userId, today, now, soonDays],
    );
    return rows[0] as MyTaskCounts;
  }

  async byStatus(userId: string): Promise<Record<string, number>> {
    const rows: { status: string; n: number }[] = await this.ds.query(
      `SELECT t.status, count(*)::int AS n FROM tasks t WHERE t.assignee_user_id = $1 AND t.archived_at IS NULL AND ${OPEN} GROUP BY t.status`,
      [userId],
    );
    return Object.fromEntries(rows.map((r) => [r.status, r.n]));
  }

  async waiting(userId: string): Promise<{ review: number; approval: number }> {
    const rows: { review: number; approval: number }[] = await this.ds.query(
      `SELECT count(*) FILTER (WHERE t.reviewer_user_id = $1 AND t.status = 'awaiting_review')::int AS review,
              count(*) FILTER (WHERE t.approver_user_id = $1 AND t.status = 'pending_approval')::int AS approval
       FROM tasks t WHERE t.archived_at IS NULL`,
      [userId],
    );
    return rows[0] as { review: number; approval: number };
  }

  async team(viewer: TaskViewer, scope: PermissionScope, input: { today: string; now: Date; staleDays: number }): Promise<TeamTaskCounts> {
    const values: unknown[] = [viewer.userId, input.today, input.now, input.staleDays];
    const reach = reachSql(scope, viewer, 'ae', values);
    const rows: TeamTaskCounts[] = await this.ds.query(
      `SELECT count(*) FILTER (WHERE ${OPEN} AND t.due_date < $2::date)::int AS overdue,
              count(*) FILTER (WHERE ${OPEN} AND t.status <> 'pending_approval' AND t.last_activity_at < $3::timestamptz - ($4::int * interval '1 day'))::int AS stale,
              count(*) FILTER (WHERE t.status = 'done' AND t.completed_at >= $3::timestamptz - interval '7 days')::int AS "doneThisWeek"
       FROM tasks t JOIN employees ae ON ae.user_id = t.assignee_user_id AND ae.deleted_at IS NULL
       WHERE t.archived_at IS NULL AND t.assignee_user_id <> $1 AND ${reach}`,
      values,
    );
    return rows[0] as TeamTaskCounts;
  }
}
