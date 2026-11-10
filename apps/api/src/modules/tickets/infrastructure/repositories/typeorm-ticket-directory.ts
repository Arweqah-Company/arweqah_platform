import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { TicketDirectory } from '../../domain/contracts/ticket-directory.port';
import type { DepartmentFacts, PersonRecord } from '../../domain/types/ticket.types';

/**
 * A desk may be any active organization unit, of any type (sector, department, section, unit, office or an added type):
 * the type of the level no longer matters. A manager counts only while their employee record and account are active.
 * `managersAbove` lists the active managers of the unit and of every unit above it: whoever leads a sector or a department
 * reaches that unit and everything below it. Read-only SQL over the org, employee and user tables.
 */
const DEPARTMENTS = `
  SELECT n.id AS "orgNodeId", n.parent_id AS "parentId", n.company_id AS "companyId", to_char(n.start_date, 'YYYY-MM-DD') AS "startDate",
         m.user_id AS "managerUserId", m.full_name AS "managerName",
         ARRAY(SELECT e2.user_id::text FROM org_node_closure c
               JOIN org_nodes a ON a.id = c.ancestor_id AND a.deleted_at IS NULL
               JOIN employees e2 ON e2.id = a.manager_id AND e2.deleted_at IS NULL
               JOIN users u2 ON u2.id = e2.user_id AND u2.is_active
               WHERE c.descendant_id = n.id) AS "managersAbove"
  FROM org_nodes n
  LEFT JOIN (SELECT e.id, e.user_id, e.full_name FROM employees e JOIN users u ON u.id = e.user_id AND u.is_active WHERE e.deleted_at IS NULL) m ON m.id = n.manager_id
  WHERE n.deleted_at IS NULL AND n.is_active`;

const DEPARTMENTS_OF = `${DEPARTMENTS} AND n.id = ANY($1)`;
const MANAGED = `SELECT d."orgNodeId" AS id FROM (${DEPARTMENTS}) d WHERE $1 = ANY(d."managersAbove")`;
const ACTIVE_EMPLOYEE = `SELECT u.id, COALESCE(e.full_name, u.name) AS name FROM users u JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = $1 AND u.is_active`;
const PEOPLE = `SELECT u.id, COALESCE(e.full_name, u.name) AS name FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = ANY($1)`;

const COMPANIES_OF = `SELECT u.id, e.company_id AS "companyId" FROM users u JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.is_active AND u.id = ANY($1)`;
const MENTIONABLES = `SELECT u.id, COALESCE(e.full_name, u.name) AS name FROM users u JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.is_active AND e.company_id = $1`;
const MENTIONABLES_BY_NAME = `${MENTIONABLES} AND COALESCE(e.full_name, u.name) ILIKE $2 ORDER BY name LIMIT 20`;
const MENTIONABLES_ALL = `${MENTIONABLES} ORDER BY name LIMIT 20`;

@Injectable()
export class TypeOrmTicketDirectory extends TicketDirectory {
  constructor(private readonly ds: DataSource) {
    super();
  }

  departments(nodeIds?: string[]): Promise<DepartmentFacts[]> {
    return nodeIds ? this.ds.query(DEPARTMENTS_OF, [nodeIds]) : this.ds.query(DEPARTMENTS);
  }

  async managedDepartmentIds(userId: string): Promise<string[]> {
    const rows: { id: string }[] = await this.ds.query(MANAGED, [userId]);
    return rows.map((r) => r.id);
  }

  async companiesOf(userIds: string[]): Promise<Map<string, string>> {
    if (!userIds.length) return new Map();
    const rows: { id: string; companyId: string }[] = await this.ds.query(COMPANIES_OF, [userIds]);
    return new Map(rows.map((r) => [r.id, r.companyId]));
  }

  mentionables(companyId: string, search?: string): Promise<PersonRecord[]> {
    return search ? this.ds.query(MENTIONABLES_BY_NAME, [companyId, likeContains(search)]) : this.ds.query(MENTIONABLES_ALL, [companyId]);
  }

  async activeEmployee(userId: string): Promise<PersonRecord | null> {
    const rows: PersonRecord[] = await this.ds.query(ACTIVE_EMPLOYEE, [userId]);
    return rows[0] ?? null;
  }

  async people(userIds: string[]): Promise<Map<string, PersonRecord>> {
    if (!userIds.length) return new Map();
    const rows: PersonRecord[] = await this.ds.query(PEOPLE, [userIds]);
    return new Map(rows.map((r) => [r.id, r]));
  }

  assignableEmployees(companyId: string, search?: string): Promise<PersonRecord[]> {
    const like = search ? likeContains(search) : null;
    return this.ds.query(
      `SELECT u.id, e.full_name AS name FROM employees e JOIN users u ON u.id = e.user_id AND u.is_active
       WHERE e.company_id = $1 AND e.deleted_at IS NULL AND NOT e.is_system_account
         AND ($2::text IS NULL OR e.full_name ILIKE $2 OR e.employee_number ILIKE $2)
       ORDER BY e.full_name LIMIT 30`,
      [companyId, like],
    );
  }
}
