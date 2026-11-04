import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BULK_PLACEMENT_FIELDS, CorePermission, type BulkRefusalDto, type BulkUpdateInput, type BulkUpdateResultDto, type ChangeAssignmentsInput } from '@arweqah-platform/shared';
import { rehearse } from '../../../../common/application/rehearse';
import { TransactionRunner, type TransactionContext } from '../../../../common/application/transaction-runner';
import { DomainError, ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';
import { ACCESS_CHANGED, EMPLOYEES_CHANGED } from '../../../../core/access/application/access.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { Employee } from '../../domain/entities/employee.entity';
import { InvalidReferenceError } from '../../domain/errors/employee.errors';
import { EMPLOYEE_AUDIT } from '../messages/employee.messages';
import { EmployeeAssignmentsService } from './employee-assignments.service';
import { EmployeesService } from './employees.service';
import { EmployeeReachPolicy } from '../policies/employee-reach.policy';
import { EmployeeAuditService } from './employee-audit.service';

const P = CorePermission;
type Plain = Pick<BulkUpdateInput, 'workLocation' | 'workMode' | 'relationTypeId'>;

/** The plain values of a bulk edit (the ones that keep no history), as employee columns. */
function plainValues(input: Plain): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  if (input.workLocation !== undefined) values.workLocation = input.workLocation;
  if (input.workMode !== undefined) values.workMode = input.workMode;
  if (input.relationTypeId !== undefined) values.relationTypeId = input.relationTypeId;
  return values;
}

const placementInput = (input: BulkUpdateInput): ChangeAssignmentsInput => ({
  orgNodeId: input.orgNodeId,
  jobTitleId: input.jobTitleId,
  managerId: input.managerId,
  validFrom: input.validFrom as string,
  reason: input.reason as string,
});

/**
 * One change for many employees (FR-93): each employee is changed on their own (their own transaction, history and audit entry), so a refusal never blocks the others.
 * The preview runs the same code and rolls it back, so what it says is what the real run does.
 */
@Injectable()
export class EmployeeBulkService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly assignments: EmployeeAssignmentsService,
    private readonly employeesService: EmployeesService,
    private readonly reach: EmployeeReachPolicy,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
    private readonly auditor: EmployeeAuditService,
  ) {}

  async run(ctx: AccessContext, input: BulkUpdateInput, actorId: string): Promise<BulkUpdateResultDto> {
    this.assertMayRun(ctx, input);
    const names = await this.employees.names(input.employeeIds);
    const result: BulkUpdateResultDto = { dryRun: input.dryRun, accepted: [], rejected: [] };
    const changedUsers: string[] = [];
    for (const id of input.employeeIds) {
      const person = { id, fullName: names.get(id) ?? '' };
      try {
        changedUsers.push(await this.handle(ctx, input, id, actorId));
        result.accepted.push(person);
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        result.rejected.push(refusal(person, error));
      }
    }
    if (!input.dryRun && changedUsers.length) await this.announce(changedUsers, actorId, result);
    return result;
  }

  /** The bulk key opens the endpoint; each kind of value also needs the key of its own action. */
  private assertMayRun(ctx: AccessContext, input: BulkUpdateInput): void {
    const placement = BULK_PLACEMENT_FIELDS.some((f) => input[f] !== undefined);
    const plain = Object.keys(plainValues(input)).length > 0;
    if ((placement && !ctx.has(P.EmployeesAssignChange)) || (plain && !ctx.has(P.EmployeesUpdate))) throw new ForbiddenError();
  }

  /** Changes one employee (or, in a preview, finds out whether it could be changed); returns their account id. */
  private async handle(ctx: AccessContext, input: BulkUpdateInput, id: string, actorId: string): Promise<string> {
    const placement = BULK_PLACEMENT_FIELDS.some((f) => input[f] !== undefined);
    const plain = plainValues(input);
    const employee = await this.reach.find(ctx, id, placement ? P.EmployeesAssignChange : P.EmployeesUpdate);
    if (placement && Object.keys(plain).length && !this.reach.can(ctx, P.EmployeesUpdate, employee)) throw new NotFoundError('Employee', id);
    await this.save(employee, input, plain, actorId);
    return employee.userId;
  }

  /** Saves the placement and the plain fields of one employee together: if the placement is refused nothing of them is saved (and the preview rolls both back). */
  private async save(employee: Employee, input: BulkUpdateInput, plain: Record<string, unknown>, actorId: string): Promise<void> {
    const hasPlain = Object.keys(plain).length > 0;
    const write = (tx: TransactionContext) => this.employees.update(employee.id, plain, tx);
    if (BULK_PLACEMENT_FIELDS.some((f) => input[f] !== undefined)) {
      await this.assignments.apply(employee, placementInput(input), { actorId, dryRun: input.dryRun, announce: false, alongside: hasPlain ? write : undefined });
    } else if (hasPlain) {
      await (input.dryRun ? rehearse(this.tx, write) : this.tx.run(write));
    }
    if (hasPlain && !input.dryRun) await this.afterPlain(employee, plain, actorId);
  }

  /** What follows saving the plain fields: the base role follows the relation type, and the change is audited (field names only). */
  private async afterPlain(employee: Employee, values: Record<string, unknown>, actorId: string): Promise<void> {
    if ('relationTypeId' in values) await this.employeesService.swapBaseRoleIfRelationChanged(employee, (values.relationTypeId as string | null) ?? null);
    this.auditor.record(actorId, EMPLOYEE_AUDIT.updated, employee.id, { fields: Object.keys(values) });
  }

  /** Tells the platform once: every changed person's access is read again and the automatic roles are recomputed a single time. */
  private async announce(userIds: string[], actorId: string, result: BulkUpdateResultDto): Promise<void> {
    for (const userId of userIds) this.events.emit(ACCESS_CHANGED, { userId });
    await this.events.emitAsync(EMPLOYEES_CHANGED);
    this.auditor.record(actorId, EMPLOYEE_AUDIT.bulkUpdated, 'bulk', { accepted: result.accepted.length, rejected: result.rejected.length });
  }
}

/** A person outside the caller's reach is refused as «not found» and carries no name: the list must not tell who they are. */
function refusal(person: { id: string; fullName: string }, error: DomainError): BulkRefusalDto {
  const invalid = error instanceof InvalidReferenceError;
  const named = error instanceof NotFoundError ? { id: person.id, fullName: '' } : person;
  return { ...named, code: invalid ? 'INVALID_REFERENCE' : error.code, message: error.message };
}
