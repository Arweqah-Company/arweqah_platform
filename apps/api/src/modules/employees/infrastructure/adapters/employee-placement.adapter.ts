import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { returnedRows } from '../../../../common/infrastructure/query-result';
import { managerOf } from '../../../../common/infrastructure/typeorm-transaction-runner';
import { EmployeePlacementPort } from '../../../org/domain/contracts/employee-placement.port';

const COUNT_BY_COMPANY = 'SELECT company_id AS id, count(*) AS n FROM employees WHERE company_id = ANY($1) AND deleted_at IS NULL GROUP BY company_id';
const COUNT_BY_NODE = 'SELECT org_node_id AS id, count(*) AS n FROM employees WHERE org_node_id = ANY($1) AND deleted_at IS NULL GROUP BY org_node_id';
const COUNT_BY_TITLE = 'SELECT job_title_id AS id, count(*) AS n FROM employees WHERE job_title_id = ANY($1) AND deleted_at IS NULL GROUP BY job_title_id';

const counts = (rows: { id: string; n: string }[]): Map<string, number> => new Map(rows.map((r) => [r.id, Number(r.n)]));

/**
 * What the org module asks of the employees placed in its units. Direct SQL on purpose: org
 * never depends on this module, and these are set-based updates inside the caller's transaction.
 */
@Injectable()
export class EmployeePlacementAdapter extends EmployeePlacementPort {
  constructor(private readonly ds: DataSource) {
    super();
  }

  private async countBy(sql: string, ids: string[]): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    return counts(await this.ds.query(sql, [ids]));
  }

  countByCompanies(companyIds: string[]): Promise<Map<string, number>> {
    return this.countBy(COUNT_BY_COMPANY, companyIds);
  }

  countByNodes(nodeIds: string[]): Promise<Map<string, number>> {
    return this.countBy(COUNT_BY_NODE, nodeIds);
  }

  countByTitles(titleIds: string[]): Promise<Map<string, number>> {
    return this.countBy(COUNT_BY_TITLE, titleIds);
  }

  async namesOf(employeeIds: string[]): Promise<Map<string, string>> {
    if (!employeeIds.length) return new Map();
    const rows: { id: string; full_name: string }[] = await this.ds.query('SELECT id, full_name FROM employees WHERE id = ANY($1)', [employeeIds]);
    return new Map(rows.map((r) => [r.id, r.full_name]));
  }

  async exists(employeeId: string, companyId?: string): Promise<boolean> {
    const rows: unknown[] = companyId
      ? await this.ds.query('SELECT 1 FROM employees WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL', [employeeId, companyId])
      : await this.ds.query('SELECT 1 FROM employees WHERE id = $1 AND deleted_at IS NULL', [employeeId]);
    return rows.length > 0;
  }

  async transfer(
    command: { fromNodeIds: string[]; targetNodeId: string; titleMap: Record<string, string>; fallbackTitleId: string },
    tx: TransactionContext,
  ): Promise<number> {
    const rows = returnedRows<{ id: string }>(await this.m(tx).query(
      `UPDATE employees
       SET org_node_id = $2,
           job_title_id = COALESCE(($3::jsonb ->> job_title_id::text)::uuid, $4),
           updated_at = now()
       WHERE org_node_id = ANY($1) AND deleted_at IS NULL
       RETURNING id`,
      [command.fromNodeIds, command.targetNodeId, JSON.stringify(command.titleMap), command.fallbackTitleId],
    ));
    return rows.length;
  }

  /** One transaction: the employees are soft-deleted, their accounts disabled and their sessions ended. */
  async remove(command: { fromNodeIds: string[]; actorId: string }, tx: TransactionContext): Promise<number> {
    const m = this.m(tx);
    const rows = returnedRows<{ user_id: string }>(await m.query(
      `UPDATE employees SET deleted_at = now(), updated_at = now()
       WHERE org_node_id = ANY($1) AND deleted_at IS NULL AND is_system_account = false RETURNING user_id`,
      [command.fromNodeIds],
    ));
    const userIds = rows.map((r) => r.user_id);
    if (userIds.length) {
      await m.query('UPDATE users SET is_active = false, updated_at = now() WHERE id = ANY($1)', [userIds]);
      await m.query('DELETE FROM auth_sessions WHERE user_id = ANY($1)', [userIds]);
    }
    return userIds.length;
  }

  private m(tx: TransactionContext): EntityManager {
    return managerOf(tx, this.ds.manager);
  }
}
