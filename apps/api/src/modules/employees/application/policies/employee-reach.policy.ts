import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { Employee } from '../../domain/entities/employee.entity';
import { isTeammate } from '../../domain/rules/directory.rules';

/** Is an employee inside what a permission reaches for the caller? A record outside it does not exist for them (404). */
@Injectable()
export class EmployeeReachPolicy {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly ability: AbilityFactory,
  ) {}

  can(ctx: AccessContext, key: string, employee: Employee): boolean {
    return this.ability.can(ctx, key, { ownerId: employee.userId, companyId: employee.companyId, orgNodeId: employee.orgNodeId });
  }

  /** The person themselves, or someone of their very own unit («My team»). */
  async isOfMyTeam(ctx: AccessContext, employee: Employee): Promise<boolean> {
    if (employee.userId === ctx.userId) return true;
    const viewer = await this.employees.findByUserId(ctx.userId);
    return !!viewer && isTeammate(viewer, employee);
  }

  async find(ctx: AccessContext, id: string, key: string): Promise<Employee> {
    const employee = await this.employees.findById(id);
    if (!employee || !this.can(ctx, key, employee)) throw new NotFoundError('Employee', id);
    return employee;
  }
}
