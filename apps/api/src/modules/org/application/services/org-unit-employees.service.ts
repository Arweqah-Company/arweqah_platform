import { Injectable } from '@nestjs/common';
import type { OrgUnitEmployeeDto } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { ORG_VIEW_FULL } from '../policies/org-access.policy';
import { OrgVisibilityService } from './org-visibility.service';

/**
 * The people placed directly in a unit, for its details panel; a unit that does not exist or the caller may not see is 404.
 * In a unit managed per company the caller sees only the people of their own company (as everywhere else); the full view and a shared unit show everyone.
 */
@Injectable()
export class OrgUnitEmployeesService {
  constructor(
    private readonly employees: EmployeePlacementPort,
    private readonly visibility: OrgVisibilityService,
    private readonly repo: OrgRepository,
  ) {}

  async list(ctx: AccessContext, nodeId: string): Promise<OrgUnitEmployeeDto[]> {
    if (!(await this.repo.node(nodeId))) throw new NotFoundError('Unit', nodeId);
    await this.visibility.assertVisible(ctx, nodeId);
    return this.employees.unitEmployees(nodeId, await this.companyOf(ctx, nodeId));
  }

  /** The one company the list is limited to, or null for everyone. */
  private async companyOf(ctx: AccessContext, nodeId: string): Promise<string | null> {
    if (ctx.has(ORG_VIEW_FULL)) return null;
    const mode = (await this.repo.effectiveModesOf([nodeId])).get(nodeId);
    return mode === 'per_company' ? ctx.placement.companyId : null;
  }
}
