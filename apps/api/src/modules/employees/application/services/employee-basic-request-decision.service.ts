import { Injectable } from '@nestjs/common';
import { CorePermission, type BasicRequestDto, type RejectBasicRequestInput } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { IdentityProvider } from '../../../../core/auth/application/identity-provider';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { LookupsService } from '../../../lookups/application/services/lookups.service';
import { EmployeeBasicRequestRepository } from '../../domain/contracts/employee-basic-request.repository';
import type { EmployeeBasicRequest } from '../../domain/entities/employee-basic-request.entity';
import type { Employee } from '../../domain/entities/employee.entity';
import { BasicRequestNotAllowedError, BasicRequestNotPendingError } from '../../domain/errors/basic-request.errors';
import { FieldNotEditableError } from '../../domain/errors/employee.errors';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import { EmployeeEditPolicy } from '../policies/employee-edit.policy';
import { EmployeeReachPolicy } from '../policies/employee-reach.policy';
import { EMPLOYEE_AUDIT } from '../messages/employee.messages';
import { basicRequestDto } from '../transformers/basic-request.transformer';
import { assertKnownLookups } from './employee-basic-request.service';
import { EmployeeAuditService } from './employee-audit.service';
import { EmployeeBasicRequestNotifier } from './employee-basic-request-notifier.service';

interface Outcome {
  status: 'approved' | 'rejected';
  reason: string | null;
  employee: Employee;
  work: (tx: TransactionContext) => Promise<void>;
}

/**
 * HR's side (FR-162): the request waiting for an employee, and its approval or rejection. Whoever holds «edit employees» for the employee **and** for every field
 * asked for may decide; nobody decides their own request. Approving writes the values to the record.
 */
@Injectable()
export class EmployeeBasicRequestDecisionService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly requests: EmployeeBasicRequestRepository,
    private readonly reach: EmployeeReachPolicy,
    private readonly editing: EmployeeEditPolicy,
    private readonly lookups: LookupsService,
    private readonly identity: IdentityProvider,
    private readonly notifier: EmployeeBasicRequestNotifier,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly audit: EmployeeAuditService,
  ) {}

  /** The request waiting for the employee, or null; only for someone who may change the employee's record. */
  async pending(ctx: AccessContext, employeeId: string): Promise<BasicRequestDto | null> {
    await this.reach.find(ctx, employeeId, CorePermission.EmployeesUpdate);
    const row = await this.requests.pending(employeeId);
    return row ? basicRequestDto(row, await this.lookups.all('ar')) : null;
  }

  async approve(ctx: AccessContext, employeeId: string): Promise<BasicRequestDto> {
    const { employee, row } = await this.decidable(ctx, employeeId);
    const lookups = await this.lookups.all('ar');
    assertKnownLookups(row.changes, lookups);
    const decided = await this.settle(ctx, row, { status: 'approved', reason: null, employee, work: async (tx) => { await this.employees.update(employee.id, row.changes, tx); } });
    if (row.changes.fullName) await this.identity.updateAccount(employee.userId, { name: row.changes.fullName });
    this.audit.record(ctx.userId, EMPLOYEE_AUDIT.basicApproved, employee.id, { fields: Object.keys(row.changes) });
    return basicRequestDto(decided, lookups);
  }

  async reject(ctx: AccessContext, employeeId: string, input: RejectBasicRequestInput): Promise<BasicRequestDto> {
    const { employee, row } = await this.decidable(ctx, employeeId);
    const reason = input.reason?.trim() || null;
    const decided = await this.settle(ctx, row, { status: 'rejected', reason, employee, work: async () => undefined });
    this.audit.record(ctx.userId, EMPLOYEE_AUDIT.basicRejected, employee.id, { fields: Object.keys(row.changes) });
    return basicRequestDto(decided, await this.lookups.all('ar'));
  }

  /** Settles the request while it is still pending, does the outcome's own work and tells the employee, all in one transaction. */
  private async settle(ctx: AccessContext, row: EmployeeBasicRequest, outcome: Outcome): Promise<EmployeeBasicRequest> {
    const { status, reason, employee, work } = outcome;
    const decidedAt = this.clock.now();
    await this.tx.run(async (tx) => {
      if (!(await this.requests.settle(row.id, { status, decidedBy: ctx.userId, decidedAt, rejectionReason: reason }, tx))) throw new BasicRequestNotPendingError();
      await work(tx);
      await this.notifier.decided(employee, status === 'approved', reason, tx);
    });
    return { ...row, status, decidedBy: ctx.userId, decidedAt, rejectionReason: reason };
  }

  private async decidable(ctx: AccessContext, employeeId: string): Promise<{ employee: Employee; row: EmployeeBasicRequest }> {
    const employee = await this.reach.find(ctx, employeeId, CorePermission.EmployeesUpdate);
    if (employee.userId === ctx.userId) throw new BasicRequestNotAllowedError('Nobody decides their own request', 'لا يبتّ أحد في طلبه بنفسه');
    const row = await this.requests.pending(employee.id);
    if (!row) throw new BasicRequestNotPendingError();
    const blocked = this.editing.blocked(ctx, employee, Object.keys(row.changes));
    if (blocked.length) throw new FieldNotEditableError(blocked);
    return { employee, row };
  }
}
