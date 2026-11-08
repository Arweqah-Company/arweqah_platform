import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmployeeCareerPort, type CareerEmployee } from '../../../career-profile/domain/contracts/employee-career.port';

/** An employee counts while their contract has not ended (the day is Riyadh's). */
const ACTIVE = `deleted_at IS NULL AND (end_date IS NULL OR end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date)`;
const FOR_USER = `SELECT e.id, e.job_title_id, e.is_system_account, e.full_name, m.full_name AS manager_name FROM employees e LEFT JOIN employees m ON m.id = e.manager_id WHERE e.user_id = $1 AND e.deleted_at IS NULL AND (e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date) LIMIT 1`;
const HOLDER_COUNT = `SELECT count(*) AS n FROM employees WHERE job_title_id = $1 AND ${ACTIVE}`;

/** What the career path asks of the employees. Direct SQL on purpose: the career module never depends on this one. */
@Injectable()
export class EmployeeCareerAdapter extends EmployeeCareerPort {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async forUser(userId: string): Promise<CareerEmployee | null> {
    const rows: { id: string; job_title_id: string | null; is_system_account: boolean; full_name: string; manager_name: string | null }[] = await this.ds.query(FOR_USER, [userId]);
    const row = rows[0];
    return row ? { employeeId: row.id, titleId: row.job_title_id, isSystemAccount: row.is_system_account, fullName: row.full_name, managerName: row.manager_name } : null;
  }

  async holderCount(titleId: string): Promise<number> {
    const rows: { n: string }[] = await this.ds.query(HOLDER_COUNT, [titleId]);
    return Number(rows[0]?.n ?? 0);
  }
}
