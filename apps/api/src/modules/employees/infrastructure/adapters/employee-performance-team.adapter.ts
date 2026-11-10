import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import { applyScope } from '../../../../core/access/infrastructure/scope-query';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { PerformanceTeamPort, type TeamPerson } from '../../../performance/domain/contracts/performance-roster.port';
import { Employee } from '../../domain/entities/employee.entity';

/** An employee counts while their contract has not ended (the day is Riyadh's). */
const ACTIVE = `e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date`;
const MAX_TEAM = 500;

interface TeamRow {
  employeeId: string;
  userId: string;
  name: string;
  titleId: string;
  managerUserId: string | null;
  managerName: string | null;
  upperUserId: string | null;
  upperName: string | null;
}

const toPerson = (r: TeamRow): TeamPerson => ({ employeeId: r.employeeId, userId: r.userId, name: r.name, titleId: r.titleId, managerUserId: r.managerUserId, managerName: r.managerName, upperManagerUserId: r.upperUserId, upperManagerName: r.upperName });

/** The people a scope reaches who hold a title, with the two managers above each, through the same scope filter every list uses; the viewer is never in their own team. */
@Injectable()
export class EmployeePerformanceTeamAdapter extends PerformanceTeamPort {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async members(filter: ScopeFilter, options: { search?: string; directOnly?: boolean }): Promise<TeamPerson[]> {
    const qb = this.query(filter);
    if (options.search) qb.andWhere('e.full_name ILIKE :search', { search: likeContains(options.search) });
    if (options.directOnly) qb.andWhere('m.user_id = :viewer', { viewer: filter.userId });
    return (await qb.orderBy('e.full_name', 'ASC').limit(MAX_TEAM).getRawMany<TeamRow>()).map(toPerson);
  }

  async member(filter: ScopeFilter, employeeId: string): Promise<TeamPerson | null> {
    const row = await this.query(filter).andWhere('e.id = :employeeId', { employeeId }).getRawOne<TeamRow>();
    return row ? toPerson(row) : null;
  }

  private query(filter: ScopeFilter) {
    const qb = this.ds.getRepository(Employee).createQueryBuilder('e')
      .leftJoin(Employee, 'm', 'm.id = e.manager_id AND m.deleted_at IS NULL')
      .leftJoin(Employee, 'u', 'u.id = m.manager_id AND u.deleted_at IS NULL')
      .select(['e.id AS "employeeId"', 'e.user_id AS "userId"', 'e.full_name AS name', 'e.job_title_id AS "titleId"', 'm.user_id AS "managerUserId"', 'm.full_name AS "managerName"', 'u.user_id AS "upperUserId"', 'u.full_name AS "upperName"'])
      .where('e.deleted_at IS NULL').andWhere('e.job_title_id IS NOT NULL').andWhere(`(${ACTIVE})`).andWhere('e.user_id <> :viewer', { viewer: filter.userId });
    return applyScope(qb, filter, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
  }
}
