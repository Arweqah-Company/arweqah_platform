import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import { applyScope } from '../../../../core/access/infrastructure/scope-query';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { CareerTeamPort, type TeamPerson } from '../../../career-profile/domain/contracts/career-team.port';
import { Employee } from '../../domain/entities/employee.entity';

/** An employee counts while their contract has not ended (the day is Riyadh's). */
const ACTIVE = `e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date`;
const MAX_TEAM = 500;

/** The people a view scope reaches, through the same scope filter every list uses; the viewer is never in their own team. */
@Injectable()
export class EmployeeTeamAdapter extends CareerTeamPort {
  constructor(private readonly ds: DataSource) {
    super();
  }

  async members(filter: ScopeFilter, search?: string): Promise<TeamPerson[]> {
    const qb = this.ds.getRepository(Employee).createQueryBuilder('e').select(['e.id', 'e.userId', 'e.fullName', 'e.jobTitleId']).where('e.deleted_at IS NULL').andWhere(`(${ACTIVE})`).andWhere('e.user_id <> :viewer', { viewer: filter.userId });
    applyScope(qb, filter, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
    if (search) qb.andWhere('e.full_name ILIKE :search', { search: likeContains(search) });
    return (await qb.orderBy('e.full_name', 'ASC').take(MAX_TEAM).getMany()).map(toPerson);
  }

  async member(filter: ScopeFilter, employeeId: string): Promise<TeamPerson | null> {
    const qb = this.ds.getRepository(Employee).createQueryBuilder('e').select(['e.id', 'e.userId', 'e.fullName', 'e.jobTitleId']).where('e.deleted_at IS NULL').andWhere('e.id = :employeeId', { employeeId }).andWhere('e.user_id <> :viewer', { viewer: filter.userId });
    applyScope(qb, filter, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
    const row = await qb.getOne();
    return row ? toPerson(row) : null;
  }
}

const toPerson = (e: Employee): TeamPerson => ({ employeeId: e.id, userId: e.userId, name: e.fullName, titleId: e.jobTitleId });
