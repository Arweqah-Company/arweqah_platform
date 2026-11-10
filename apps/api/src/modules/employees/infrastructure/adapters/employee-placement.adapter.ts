import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { EmployeeAssignmentsService } from '../../application/services/employee-assignments.service';
import { AssignmentNoChangeError } from '../../domain/errors/assignment.errors';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import { EmployeePlacementPort, type PlacedEmployee, type TitleHolders } from '../../../org/domain/contracts/employee-placement.port';

const COUNT_BY_COMPANY = 'SELECT company_id AS id, count(*) AS n FROM employees WHERE company_id = ANY($1) AND deleted_at IS NULL GROUP BY company_id';
const COUNT_BY_NODE = 'SELECT org_node_id AS id, count(*) AS n FROM employees WHERE org_node_id = ANY($1) AND deleted_at IS NULL GROUP BY org_node_id';
const COUNT_BY_TITLE = 'SELECT job_title_id AS id, count(*) AS n FROM employees WHERE job_title_id = ANY($1) AND deleted_at IS NULL GROUP BY job_title_id';

/** An employee counts while their contract has not ended (the day is Riyadh's). */
const ACTIVE = `e.deleted_at IS NULL AND (e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date)`;

const counts = (rows: { id: string; n: string }[]): Map<string, number> => new Map(rows.map((r) => [r.id, Number(r.n)]));

/**
 * What the org module asks of the employees placed in its units. Direct SQL on purpose: org
 * never depends on this module.
 */
@Injectable()
export class EmployeePlacementAdapter extends EmployeePlacementPort {
  constructor(
    private readonly ds: DataSource,
    private readonly assignments: EmployeeAssignmentsService,
    private readonly employees: EmployeeRepository,
  ) {
    super();
  }

  async place(input: { employeeId: string; orgNodeId: string; jobTitleId: string; validFrom: string; reason: string; actorId: string }): Promise<void> {
    const employee = await this.employees.findById(input.employeeId);
    if (!employee) throw new NotFoundError('Employee', input.employeeId);
    const change = { orgNodeId: input.orgNodeId, jobTitleId: input.jobTitleId, validFrom: input.validFrom, reason: input.reason };
    await this.assignments.apply(employee, change, { actorId: input.actorId, dryRun: false }).catch((error: unknown) => {
      if (!(error instanceof AssignmentNoChangeError)) throw error; // already in that unit with that title
    });
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

  async staffByUnitAndCompany(): Promise<Map<string, Map<string, number>>> {
    const rows: { unit: string; company: string; n: string }[] = await this.ds.query(
      'SELECT org_node_id AS unit, company_id AS company, count(*) AS n FROM employees WHERE org_node_id IS NOT NULL AND deleted_at IS NULL GROUP BY org_node_id, company_id',
    );
    const out = new Map<string, Map<string, number>>();
    for (const row of rows) out.set(row.unit, (out.get(row.unit) ?? new Map<string, number>()).set(row.company, Number(row.n)));
    return out;
  }

  async companiesOf(employeeIds: string[]): Promise<Map<string, string>> {
    if (!employeeIds.length) return new Map();
    const rows: { id: string; company_id: string }[] = await this.ds.query('SELECT id, company_id FROM employees WHERE id = ANY($1) AND deleted_at IS NULL', [employeeIds]);
    return new Map(rows.map((r) => [r.id, r.company_id]));
  }

  async userNamesOf(userIds: string[]): Promise<Map<string, string>> {
    if (!userIds.length) return new Map();
    const rows: { user_id: string; full_name: string }[] = await this.ds.query('SELECT user_id, full_name FROM employees WHERE user_id = ANY($1)', [userIds]);
    return new Map(rows.map((r) => [r.user_id, r.full_name]));
  }

  async holdersByTitle(): Promise<Map<string, Map<string, TitleHolders>>> {
    const rows: { title: string; company: string; n: string; first_id: string; first_name: string }[] = await this.ds.query(
      `SELECT e.job_title_id AS title, e.company_id AS company, count(*) AS n,
              (array_agg(e.id ORDER BY e.start_date, e.id))[1] AS first_id, (array_agg(e.full_name ORDER BY e.start_date, e.id))[1] AS first_name
       FROM employees e WHERE e.job_title_id IS NOT NULL AND ${ACTIVE} GROUP BY e.job_title_id, e.company_id`,
    );
    const out = new Map<string, Map<string, TitleHolders>>();
    for (const r of rows) out.set(r.title, (out.get(r.title) ?? new Map<string, TitleHolders>()).set(r.company, { count: Number(r.n), firstId: r.first_id, firstName: r.first_name }));
    return out;
  }

  async placedEmployees(titleIds: string[]): Promise<PlacedEmployee[]> {
    if (!titleIds.length) return [];
    const rows: { id: string; company_id: string; job_title_id: string; manager_id: string | null }[] = await this.ds.query(
      `SELECT e.id, e.company_id, e.job_title_id, e.manager_id FROM employees e WHERE e.job_title_id = ANY($1) AND ${ACTIVE}`,
      [titleIds],
    );
    return rows.map((r) => ({ id: r.id, companyId: r.company_id, titleId: r.job_title_id, managerId: r.manager_id }));
  }
}
