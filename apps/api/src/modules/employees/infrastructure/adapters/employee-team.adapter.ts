import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { ScopeFilter } from '../../../../core/access/domain/access-context';
import { applyScope } from '../../../../core/access/infrastructure/scope-query';
import { likeContains } from '../../../../common/infrastructure/sql-like';
import { CareerTeamPort, type TeamPerson } from '../../../career-profile/domain/contracts/career-team.port';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { Employee } from '../../domain/entities/employee.entity';

/** An employee counts while their contract has not ended (the day is Riyadh's). */
const ACTIVE = `e.end_date IS NULL OR e.end_date >= (now() AT TIME ZONE 'Asia/Riyadh')::date`;
const MAX_TEAM = 500;
const SELECTED = ['e.id', 'e.userId', 'e.fullName', 'e.jobTitleId', 'e.companyId', 'e.orgNodeId', 'e.workEmail', 'e.workPhone'];

/** The people a view scope reaches, through the same scope filter every list uses; the viewer is never in their own team. */
@Injectable()
export class EmployeeTeamAdapter extends CareerTeamPort {
  constructor(
    private readonly ds: DataSource,
    private readonly org: OrgDirectoryService,
  ) {
    super();
  }

  async members(filter: ScopeFilter, search?: string): Promise<TeamPerson[]> {
    const qb = this.ds.getRepository(Employee).createQueryBuilder('e').select(SELECTED).where('e.deleted_at IS NULL').andWhere(`(${ACTIVE})`).andWhere('e.user_id <> :viewer', { viewer: filter.userId });
    applyScope(qb, filter, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
    if (search) qb.andWhere('e.full_name ILIKE :search', { search: likeContains(search) });
    return this.toPeople(await qb.orderBy('e.full_name', 'ASC').take(MAX_TEAM).getMany());
  }

  async member(filter: ScopeFilter, employeeId: string): Promise<TeamPerson | null> {
    const qb = this.ds.getRepository(Employee).createQueryBuilder('e').select(SELECTED).where('e.deleted_at IS NULL').andWhere('e.id = :employeeId', { employeeId }).andWhere('e.user_id <> :viewer', { viewer: filter.userId });
    applyScope(qb, filter, { owner: 'e.user_id', company: 'e.company_id', orgNode: 'e.org_node_id' });
    const row = await qb.getOne();
    return row ? ((await this.toPeople([row]))[0] ?? null) : null;
  }

  /** The people with the names of their unit and company, for the work-details columns. */
  private async toPeople(rows: Employee[]): Promise<TeamPerson[]> {
    const [companies, nodes] = await Promise.all([this.org.describeCompanies([...new Set(rows.map((e) => e.companyId))]), this.org.describeNodes(rows.flatMap((e) => (e.orgNodeId ? [e.orgNodeId] : [])))]);
    return rows.map((e) => toPerson(e, { company: companies.get(e.companyId), node: e.orgNodeId ? nodes.get(e.orgNodeId) : undefined }));
  }
}

const toPerson = (e: Employee, names: { company?: { nameAr: string; nameEn: string }; node?: { nameAr: string; nameEn: string } }): TeamPerson => ({
  employeeId: e.id,
  userId: e.userId,
  name: e.fullName,
  titleId: e.jobTitleId,
  contact: { unitNameAr: names.node?.nameAr ?? null, unitNameEn: names.node?.nameEn ?? null, companyNameAr: names.company?.nameAr ?? '', companyNameEn: names.company?.nameEn ?? '', workEmail: e.workEmail, workPhone: e.workPhone },
});
