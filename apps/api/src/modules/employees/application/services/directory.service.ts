import { Injectable } from '@nestjs/common';
import { CorePermission, type DirectoryEntryDto, type DirectoryProfileDto, type DirectoryQuery, type Paginated } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { Employee } from '../../domain/entities/employee.entity';
import { EmployeeReachPolicy } from '../policies/employee-reach.policy';
import { profileLevel } from '../../domain/rules/directory.rules';
import { toDirectoryEntry, toDirectoryProfile, type DirectoryNames } from '../transformers/directory.transformer';

/** «My team» (FR-92): basic details of the active colleagues of the viewer's own unit, and a profile whose depth follows the viewer's relation to the person. */
@Injectable()
export class DirectoryService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly org: OrgDirectoryService,
    private readonly reach: EmployeeReachPolicy,
  ) {}

  async list(ctx: AccessContext, query: DirectoryQuery): Promise<Paginated<DirectoryEntryDto>> {
    const viewer = await this.employees.findByUserId(ctx.userId);
    if (!viewer?.orgNodeId) return { items: [], total: 0, page: query.page, pageSize: query.pageSize };
    const page = await this.employees.team(query, viewer);
    const names = await this.namesOf(page.items);
    return { items: page.items.map((e) => toDirectoryEntry(e, names)), total: page.total, page: query.page, pageSize: query.pageSize };
  }

  async profile(ctx: AccessContext, id: string): Promise<DirectoryProfileDto> {
    const employee = await this.employees.findById(id);
    if (!employee || employee.isSystemAccount || !(await this.reach.isOfMyTeam(ctx, employee))) throw new NotFoundError('Employee', id);
    const viewer = await this.employees.findByUserId(ctx.userId);
    const level = profileLevel({
      canOpenRecord: this.reach.can(ctx, CorePermission.EmployeesView, employee),
      isSelf: employee.userId === ctx.userId,
      isInManagerChain: !!viewer && viewer.id !== employee.id && (await this.employees.reportsTo(employee.id, viewer.id)),
    });
    const manager = employee.managerId ? { id: employee.managerId, fullName: (await this.employees.names([employee.managerId])).get(employee.managerId) ?? '' } : null;
    return toDirectoryProfile(employee, await this.namesOf([employee]), level, manager);
  }

  private async namesOf(items: Employee[]): Promise<DirectoryNames> {
    const [companies, nodes, titles] = await Promise.all([
      this.org.describeCompanies([...new Set(items.map((e) => e.companyId))]),
      this.org.describeNodes(items.flatMap((e) => (e.orgNodeId ? [e.orgNodeId] : []))),
      this.org.describeTitles(items.flatMap((e) => (e.jobTitleId ? [e.jobTitleId] : []))),
    ]);
    return { companies, nodes, titles };
  }
}
