import { Injectable } from '@nestjs/common';
import type { BasicRequestDto, BasicRequestInput, LookupsDto } from '@arweqah-platform/shared';
import { Clock } from '../../../../common/application/clock';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { LookupsService } from '../../../lookups/application/services/lookups.service';
import { EmployeeBasicRequestRepository } from '../../domain/contracts/employee-basic-request.repository';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { Employee } from '../../domain/entities/employee.entity';
import { BasicRequestNoChangeError, BasicRequestNotAllowedError, BasicRequestNotPendingError, BasicRequestPendingError } from '../../domain/errors/basic-request.errors';
import { FieldRuleError } from '../../domain/errors/employee.errors';
import { EMPLOYEE_AUDIT } from '../messages/employee.messages';
import { basicRequestDto } from '../transformers/basic-request.transformer';
import { EmployeeAuditService } from './employee-audit.service';
import { EmployeeBasicRequestNotifier } from './employee-basic-request-notifier.service';

/** Only the fields whose value differs from the record: asking for what is already there is no change. */
export function changedBasics(employee: Employee, input: BasicRequestInput): BasicRequestInput {
  const current: Record<string, unknown> = { fullName: employee.fullName, gender: employee.gender, nationalityId: employee.nationalityId, birthDate: employee.birthDate, maritalStatusId: employee.maritalStatusId };
  return Object.fromEntries(Object.entries(input).filter(([field, value]) => value !== undefined && current[field] !== value)) as BasicRequestInput;
}

/** A nationality or marital status the lists do not know is refused before anything is saved. */
export function assertKnownLookups(changes: BasicRequestInput, lookups: LookupsDto): void {
  const unknown = (id: string | undefined, list: { id: string }[]) => !!id && !list.some((i) => i.id === id);
  if (unknown(changes.nationalityId, lookups.countries)) throw new FieldRuleError('nationalityId', 'Unknown option', { ar: 'خيار غير موجود', en: 'Unknown option' });
  if (unknown(changes.maritalStatusId, lookups.maritalStatuses)) throw new FieldRuleError('maritalStatusId', 'Unknown option', { ar: 'خيار غير موجود', en: 'Unknown option' });
}

/** The employee's side (FR-162): send one request to change the basic data of their record, see it, cancel it while it waits. */
@Injectable()
export class EmployeeBasicRequestService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly requests: EmployeeBasicRequestRepository,
    private readonly lookups: LookupsService,
    private readonly notifier: EmployeeBasicRequestNotifier,
    private readonly tx: TransactionRunner,
    private readonly clock: Clock,
    private readonly audit: EmployeeAuditService,
  ) {}

  async mine(ctx: AccessContext): Promise<BasicRequestDto | null> {
    const employee = await this.own(ctx);
    const latest = await this.requests.latest(employee.id);
    return latest ? basicRequestDto(latest, await this.lookups.all('ar')) : null;
  }

  async submit(ctx: AccessContext, input: BasicRequestInput): Promise<BasicRequestDto> {
    const employee = await this.own(ctx);
    const changes = changedBasics(employee, input);
    if (Object.keys(changes).length === 0) throw new BasicRequestNoChangeError();
    const lookups = await this.lookups.all('ar');
    assertKnownLookups(changes, lookups);
    if (await this.requests.pending(employee.id)) throw new BasicRequestPendingError();
    const approvers = await this.notifier.approversOf(employee, changes);
    const row = await this.tx.run(async (tx) => {
      const saved = await this.requests.insert({ employeeId: employee.id, changes, submittedAt: this.clock.now() }, tx);
      await this.notifier.sent(employee, approvers, tx);
      return saved;
    }).catch((error: unknown) => {
      if ((error as { driverError?: { code?: string } } | null)?.driverError?.code === '23505') throw new BasicRequestPendingError();
      throw error;
    });
    this.audit.record(ctx.userId, EMPLOYEE_AUDIT.basicRequested, employee.id, { fields: Object.keys(changes) });
    return basicRequestDto(row, lookups);
  }

  async cancel(ctx: AccessContext): Promise<void> {
    const employee = await this.own(ctx);
    const pending = await this.requests.pending(employee.id);
    if (!pending) throw new BasicRequestNotPendingError();
    const done = await this.tx.run((tx) => this.requests.settle(pending.id, { status: 'cancelled', decidedBy: ctx.userId, decidedAt: this.clock.now() }, tx));
    if (!done) throw new BasicRequestNotPendingError();
    this.audit.record(ctx.userId, EMPLOYEE_AUDIT.basicCancelled, employee.id, { fields: Object.keys(pending.changes) });
  }

  private async own(ctx: AccessContext): Promise<Employee> {
    const employee = await this.employees.findByUserId(ctx.userId);
    if (!employee) throw new BasicRequestNotAllowedError('Only an employee can ask to change basic data', 'طلب التعديل متاح للموظفين فقط');
    return employee;
  }
}
