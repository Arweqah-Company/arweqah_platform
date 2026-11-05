import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/domain/domain-error';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import { OrgRepository } from '../../domain/contracts/org.repository';
import { visibleUnitIds } from '../../domain/rules/org-visibility.rules';
import { ORG_VIEW_FULL } from '../policies/org-access.policy';

/**
 * The units a person sees (plan 17.5, the same rule as the tree): the full view sees all, everyone else the units of their own company
 * (and the shared ones that have somebody in them). One place so the tree, a unit's versions and leaders, and the job titles agree.
 */
@Injectable()
export class OrgVisibilityService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly employees: EmployeePlacementPort,
  ) {}

  /** Null = every unit (`org.view_full`). */
  async visibleNodeIds(ctx: AccessContext): Promise<Set<string> | null> {
    if (ctx.has(ORG_VIEW_FULL)) return null;
    const company = ctx.placement.companyId;
    if (!company) return new Set();
    const [nodes, staff] = await Promise.all([this.repo.nodes(), this.employees.staffByUnitAndCompany()]);
    return visibleUnitIds(nodes.map((n) => ({ id: n.id, parentId: n.parentId, mode: n.managementMode })), staff, company);
  }

  /** A unit the person does not see answers 404, like a missing one. */
  async assertVisible(ctx: AccessContext, nodeId: string): Promise<void> {
    const visible = await this.visibleNodeIds(ctx);
    if (visible && !visible.has(nodeId)) throw new NotFoundError('Unit', nodeId);
  }
}
