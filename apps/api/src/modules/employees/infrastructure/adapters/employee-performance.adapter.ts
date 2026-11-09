import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PerformanceRosterPort, type RosterPerson } from '../../../performance/domain/contracts/performance-roster.port';

/** An employee counts while their contract has not ended (the day is Riyadh's). */
const ACTIVE = `e.deleted_at IS NULL AND (e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date)`;
const PEOPLE = `SELECT e.id, e.user_id, e.full_name, e.job_title_id, m.user_id AS manager_user_id, m.full_name AS manager_name
  FROM employees e LEFT JOIN employees m ON m.id = e.manager_id AND m.deleted_at IS NULL
  WHERE e.job_title_id IS NOT NULL AND ${ACTIVE}`;
/** The same query for one user: built here from constants, so no query call takes an interpolated string. */
const PERSON_BY_USER = `${PEOPLE} AND e.user_id = $1 LIMIT 1`;
const APPROVED_MINUTES = `SELECT COALESCE(SUM(minutes), 0)::int AS minutes FROM career_learning_records WHERE employee_id = $1 AND status = 'done'`;

interface PersonRow {
  id: string;
  user_id: string;
  full_name: string;
  job_title_id: string;
  manager_user_id: string | null;
  manager_name: string | null;
}

const toPerson = (r: PersonRow): RosterPerson => ({ employeeId: r.id, userId: r.user_id, name: r.full_name, titleId: r.job_title_id, managerUserId: r.manager_user_id, managerName: r.manager_name });

/** What the evaluation asks of the employees. Direct SQL on purpose: the performance module never depends on this one. */
@Injectable()
export class EmployeePerformanceAdapter extends PerformanceRosterPort {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async everyone(): Promise<RosterPerson[]> {
    return ((await this.ds.query(PEOPLE)) as PersonRow[]).map(toPerson);
  }

  async person(userId: string): Promise<RosterPerson | null> {
    const rows = (await this.ds.query(PERSON_BY_USER, [userId])) as PersonRow[];
    return rows[0] ? toPerson(rows[0]) : null;
  }

  async approvedLearningMinutes(employeeId: string): Promise<number> {
    return ((await this.ds.query(APPROVED_MINUTES, [employeeId])) as { minutes: number }[])[0]?.minutes ?? 0;
  }
}
