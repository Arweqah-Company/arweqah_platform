import { Injectable } from '@nestjs/common';
import type { OrgUnitEmployeeDto } from '@arweqah-platform/shared';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { EmployeePlacementPort } from '../../domain/contracts/employee-placement.port';
import { OrgVisibilityService } from './org-visibility.service';

/** The people placed directly in a unit, for its details panel; a unit the caller may not see is 404 like any other. */
@Injectable()
export class OrgUnitEmployeesService {
  constructor(
    private readonly employees: EmployeePlacementPort,
    private readonly visibility: OrgVisibilityService,
  ) {}

  async list(ctx: AccessContext, nodeId: string): Promise<OrgUnitEmployeeDto[]> {
    await this.visibility.assertVisible(ctx, nodeId);
    return this.employees.unitEmployees(nodeId);
  }
}
