import { Injectable } from '@nestjs/common';
import { ALWAYS_VISIBLE_FIELDS, CorePermission, POPUP_MAX_FIELDS } from '@arweqah-platform/shared';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { Employee } from '../../domain/entities/employee.entity';
import { EmployeeReachPolicy } from './employee-reach.policy';

/** The keys that act on one employee's record: holding any of them at a reach that includes the record keeps its page a page. */
const ACTION_KEYS: string[] = [
  CorePermission.EmployeesUpdate, CorePermission.EmployeesDeactivate, CorePermission.EmployeesTerminate, CorePermission.EmployeesAssignRoles, CorePermission.EmployeesAssignGroups,
  CorePermission.EmployeesAssignChange, CorePermission.EmployeesPhotoUpdate, CorePermission.EmployeesHistoryView, CorePermission.EmployeesResendInvite, CorePermission.EmployeesResetAuthenticator, CorePermission.EmployeesBulkUpdate,
];

/** What the caller may do with one employee's page: open it, which details it shows, and the buttons on it that depend on the record (photo, history). */
export interface EmployeeAbilities {
  /** The details the page shows; `null` = all of them (a person who may edit the record loads it whole, the form needs the stored values). */
  visibleFields: string[] | null;
  canChangePhoto: boolean;
  canViewHistory: boolean;
}

/**
 * «Open an employee» (`employees.open`) decides who gets the employee's page and, through the fields of each of its grants, which details they see.
 * Whoever may edit the record also opens it (the edit form reads it). The buttons that act on the record (photo, history) are judged here by the
 * record's reach, so the screen shows them only where the API would accept them: a key held at «own» is for one's own record only.
 */
@Injectable()
export class EmployeeVisibilityPolicy {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly reach: EmployeeReachPolicy,
    private readonly ability: AbilityFactory,
  ) {}

  /** The employee, when the caller may open or edit the record; otherwise it does not exist for them (404). */
  async findOpenable(ctx: AccessContext, id: string): Promise<Employee> {
    const employee = await this.employees.findById(id);
    if (!employee || !this.canOpen(ctx, employee)) throw new NotFoundError('Employee', id);
    return employee;
  }

  canOpen(ctx: AccessContext, employee: Employee): boolean {
    return this.reach.can(ctx, CorePermission.EmployeesOpen, employee) || this.reach.can(ctx, CorePermission.EmployeesUpdate, employee);
  }

  /**
   * A short page (a few listed details) with nothing to act on opens as a pop-up: the caller holds none of the keys that act on this record
   * (edit, deactivate, end of contract, roles, groups, placement, photo, history, invitation, authenticator, bulk edit) nor «sign in as».
   */
  openAs(ctx: AccessContext, employee: Employee): 'page' | 'dialog' {
    const listed = this.visibleFields(ctx, employee)?.filter((f) => !ALWAYS_VISIBLE_FIELDS.includes(f)).length ?? Infinity;
    const acts = ACTION_KEYS.some((key) => this.reach.can(ctx, key, employee)) || ctx.has(CorePermission.ImpersonationStart);
    return listed < POPUP_MAX_FIELDS && !acts ? 'dialog' : 'page';
  }

  abilities(ctx: AccessContext, employee: Employee): EmployeeAbilities {
    return {
      visibleFields: this.visibleFields(ctx, employee),
      canChangePhoto: this.reach.can(ctx, CorePermission.EmployeesPhotoUpdate, employee),
      canViewHistory: this.reach.can(ctx, CorePermission.EmployeesHistoryView, employee),
    };
  }

  private visibleFields(ctx: AccessContext, employee: Employee): string[] | null {
    if (this.reach.can(ctx, CorePermission.EmployeesUpdate, employee)) return null;
    const resource = { ownerId: employee.userId, companyId: employee.companyId, orgNodeId: employee.orgNodeId };
    return [...new Set([...ALWAYS_VISIBLE_FIELDS, ...this.ability.fieldsFor(ctx, CorePermission.EmployeesOpen, resource)])];
  }
}
