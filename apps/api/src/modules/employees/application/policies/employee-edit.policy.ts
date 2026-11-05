import { Injectable } from '@nestjs/common';
import { CorePermission } from '@arweqah-platform/shared';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import type { Employee } from '../../domain/entities/employee.entity';

/**
 * Which details of an employee the caller may change (FR-94). Every grant of «edit employees» carries its own list of fields,
 * so what a person may change of a record is the union of the lists of the grants that reach it (their own record is reached by all of them).
 */
@Injectable()
export class EmployeeEditPolicy {
  constructor(private readonly ability: AbilityFactory) {}

  editableFields(ctx: AccessContext, employee: Employee): string[] {
    return this.ability.fieldsFor(ctx, CorePermission.EmployeesUpdate, { ownerId: employee.userId, companyId: employee.companyId, orgNodeId: employee.orgNodeId });
  }

  /** The changed fields the caller may not change. */
  blocked(ctx: AccessContext, employee: Employee, changed: string[]): string[] {
    const allowed = new Set(this.editableFields(ctx, employee));
    return changed.filter((field) => !allowed.has(field));
  }
}
