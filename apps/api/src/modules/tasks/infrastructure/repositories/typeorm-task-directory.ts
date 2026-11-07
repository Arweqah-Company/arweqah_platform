import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { PermissionScope } from '@arweqah-platform/shared';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { TaskDirectory } from '../../domain/contracts/task-directory.port';
import type { TaskPerson, TaskViewer } from '../../domain/types/task.types';
import { reachSql } from './task-sql';

/** An active employee: one with an account that may sign in and an employee record that is not deleted. */
const PERSON = `SELECT u.id AS "userId", COALESCE(e.full_name, u.name) AS name, e.id AS "employeeId", e.manager_id AS "managerEmployeeId",
    m.user_id AS "managerUserId", e.org_node_id AS "orgNodeId", e.company_id AS "companyId"
  FROM users u JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
  LEFT JOIN employees m ON m.id = e.manager_id AND m.deleted_at IS NULL
  WHERE u.is_active`;

/** The nearest department above (or at) the person's unit, and its manager when that manager is active. */
const UNITS_ABOVE = `SELECT n.id FROM employees e JOIN org_node_closure c ON c.descendant_id = e.org_node_id JOIN org_nodes n ON n.id = c.ancestor_id AND n.deleted_at IS NULL
  WHERE e.user_id = $1 AND e.deleted_at IS NULL`;
const DEPARTMENT = `SELECT n.id AS "nodeId", mgr.user_id AS "managerUserId"
  FROM employees e
  JOIN org_node_closure c ON c.descendant_id = e.org_node_id
  JOIN org_nodes n ON n.id = c.ancestor_id AND n.deleted_at IS NULL
  JOIN org_levels l ON l.id = n.org_level_id AND l.template_code = 'department' AND l.deleted_at IS NULL
  LEFT JOIN (SELECT x.id, x.user_id FROM employees x JOIN users xu ON xu.id = x.user_id AND xu.is_active WHERE x.deleted_at IS NULL) mgr ON mgr.id = n.manager_id
  WHERE e.user_id = $1 AND e.deleted_at IS NULL
  ORDER BY c.depth ASC LIMIT 1`;

/** Active employees of one company, for the @ list. */
const MENTIONABLES = `SELECT u.id AS "userId", COALESCE(e.full_name, u.name) AS name FROM users u JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.is_active AND e.company_id = $1`;

const PEOPLE_BY_IDS = `${PERSON} AND u.id = ANY($1)`;

@Injectable()
export class TypeOrmTaskDirectory extends TaskDirectory {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async person(userId: string): Promise<TaskPerson | null> {
    return (await this.people([userId])).get(userId) ?? null;
  }

  async people(userIds: string[]): Promise<Map<string, TaskPerson>> {
    if (!userIds.length) return new Map();
    const rows: TaskPerson[] = await this.ds.query(PEOPLE_BY_IDS, [userIds]);
    return new Map(rows.map((r) => [r.userId, r]));
  }

  async employeeIdOf(userId: string): Promise<string | null> {
    const rows: { id: string }[] = await this.ds.query('SELECT id FROM employees WHERE user_id = $1 AND deleted_at IS NULL', [userId]);
    return rows[0]?.id ?? null;
  }

  async unitsAbove(userId: string): Promise<string[]> {
    const rows: { id: string }[] = await this.ds.query(UNITS_ABOVE, [userId]);
    return rows.map((r) => r.id);
  }

  async departmentOf(userId: string): Promise<{ nodeId: string; managerUserId: string | null } | null> {
    const rows: { nodeId: string; managerUserId: string | null }[] = await this.ds.query(DEPARTMENT, [userId]);
    return rows[0] ?? null;
  }

  async assignCandidates(viewer: TaskViewer, scope: PermissionScope | null, search?: string): Promise<TaskPerson[]> {
    const values: unknown[] = [viewer.userId];
    const reach = reachSql(scope, viewer, 'e', values);
    const where = [`u.id <> $1`, reach];
    if (search) {
      values.push(likeContains(search));
      where.push(`(COALESCE(e.full_name, u.name) ILIKE $${values.length} OR e.employee_number ILIKE $${values.length})`);
    }
    const sql = `${PERSON} AND ${where.join(' AND ')} ORDER BY name LIMIT 30`;
    return this.ds.query(sql, values);
  }

  async mentionables(companyId: string, search?: string): Promise<{ userId: string; name: string }[]> {
    const values: unknown[] = [companyId];
    if (search) values.push(likeContains(search));
    const sql = `${MENTIONABLES}${search ? ' AND COALESCE(e.full_name, u.name) ILIKE $2' : ''} ORDER BY name LIMIT 20`;
    return this.ds.query(sql, values);
  }
}
