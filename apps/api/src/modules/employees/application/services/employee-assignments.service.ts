import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorePermission, type AssignmentField, type AuditQuery, type BilingualName, type ChangeAssignmentsInput, type EmployeeAssignmentsDto, type EmployeeChangeDto, type Paginated } from '@arweqah-platform/shared';
import { rehearse } from '../../../../common/application/rehearse';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { NotFoundError } from '../../../../common/domain/domain-error';
import { todayInRiyadh } from '../../../../common/domain/riyadh-date';
import type { TransactionContext } from '../../../../common/domain/transaction-context';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import { ACCESS_CHANGED, EMPLOYEES_CHANGED } from '../../../../core/access/application/access.events';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AuditService } from '../../../../core/audit/application/audit.service';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import { EmployeeAssignmentRepository, type PeopleNames } from '../../domain/contracts/employee-assignment.repository';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { Employee } from '../../domain/entities/employee.entity';
import type { EmployeeAssignment } from '../../domain/entities/employee-assignment.entity';
import { AssignmentNoChangeError, AssignmentNotPendingError } from '../../domain/errors/assignment.errors';
import { dayBefore, planChange } from '../../domain/rules/assignment.rules';
import { ASSIGNMENT_COLUMN, type AssignmentColumn, type PlacementChange } from '../../domain/types/assignment.types';
import { EMPLOYEE_AUDIT } from '../messages/employee.messages';
import { toAssignmentDto, valueOf, type PeriodNames } from '../transformers/employee-assignment.transformer';
import { EmployeeValidationService } from './employee-validation.service';
import { EmployeeReachPolicy } from '../policies/employee-reach.policy';
import { EmployeeAuditService } from './employee-audit.service';

const FIELD_OF: Record<AssignmentColumn, AssignmentField> = { orgNodeId: 'org_node', jobTitleId: 'job_title', managerId: 'manager' };
const VALUE_COLUMN = { org_node: 'orgNodeId', job_title: 'jobTitleId', manager: 'managerEmployeeId' } as const;

/** From which day, why, and by whom a placement change is recorded. */
export interface ChangeWhen {
  validFrom: string;
  reason: string;
  actorId: string | null;
}

/** The result of recording a change: what was written to history and what is in force from today. */
export interface RecordedChange {
  recorded: AssignmentColumn[];
  appliedNow: PlacementChange;
}

/**
 * Dated placement (FR-89): the unit, the job title and the direct manager of an employee, each with its history.
 * `employees` keeps the value in force today; a change that starts later waits here until the nightly job applies it.
 */
@Injectable()
export class EmployeeAssignmentsService {
  private readonly logger = new Logger(EmployeeAssignmentsService.name);

  constructor(
    private readonly repo: EmployeeAssignmentRepository,
    private readonly employees: EmployeeRepository,
    private readonly validation: EmployeeValidationService,
    private readonly org: OrgDirectoryService,
    private readonly ability: AbilityFactory,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
    private readonly auditLog: AuditService,
    private readonly reach: EmployeeReachPolicy,
    private readonly auditor: EmployeeAuditService,
  ) {}

  async history(ctx: AccessContext, employeeId: string): Promise<EmployeeAssignmentsDto> {
    await this.reach.find(ctx, employeeId, CorePermission.EmployeesHistoryView);
    return this.dto(await this.repo.history(employeeId));
  }

  /** What was done to the employee's record, newest first (the audit entries of the record; the names of fields, never their values). */
  async changes(ctx: AccessContext, employeeId: string, query: Pick<AuditQuery, 'page' | 'pageSize'>): Promise<Paginated<EmployeeChangeDto>> {
    await this.reach.find(ctx, employeeId, CorePermission.EmployeesHistoryView);
    const page = await this.auditLog.search({ ...query, entityType: 'employee', entityId: employeeId });
    return { ...page, items: page.items.map((e) => ({ id: e.id, action: e.action, actorName: e.actorName, fields: fieldsOf(e.changes), createdAt: e.createdAt })) };
  }

  async change(ctx: AccessContext, employeeId: string, input: ChangeAssignmentsInput, actorId: string): Promise<EmployeeAssignmentsDto> {
    const employee = await this.reach.find(ctx, employeeId, CorePermission.EmployeesAssignChange);
    await this.apply(employee, input, { actorId, dryRun: false });
    return this.dto(await this.repo.history(employeeId));
  }

  /**
   * Records a change for an employee already found and allowed. With `dryRun` it is written and rolled back, so the answer (refused or not) is the real one;
   * nothing is announced or audited then. `announce: false` leaves telling the rest of the platform to the caller (a bulk edit does it once). Returns the columns the change touches.
   */
  async apply(employee: Employee, input: ChangeAssignmentsInput, how: { actorId: string; dryRun: boolean; announce?: boolean }): Promise<AssignmentColumn[]> {
    const { actorId, dryRun } = how;
    const change = placementOf(input);
    await this.assertValid(employee, change, await this.repo.history(employee.id));
    const run = (tx: TransactionContext) => this.recordAndApply(employee, change, { validFrom: input.validFrom, reason: input.reason, actorId }, tx);
    const recorded = dryRun ? await rehearse(this.tx, run) : await this.tx.run(run);
    if (!recorded.recorded.length) throw new AssignmentNoChangeError();
    if (dryRun) return recorded.recorded;
    if (how.announce !== false) await this.announce(employee.userId, Object.keys(recorded.appliedNow).length > 0);
    this.auditor.record(actorId, EMPLOYEE_AUDIT.assignmentChanged, employee.id, { fields: recorded.recorded, validFrom: input.validFrom });
    return recorded.recorded;
  }

  private async recordAndApply(employee: Employee, change: PlacementChange, when: ChangeWhen, tx: TransactionContext): Promise<RecordedChange> {
    const result = await this.record(employee, change, when, tx);
    if (Object.keys(result.appliedNow).length) await this.employees.update(employee.id, result.appliedNow, tx);
    return result;
  }

  /** Cancels a change that has not started yet; the period before it takes over the days it covered (up to the next change, or without an end when it was the last). */
  async cancel(ctx: AccessContext, employeeId: string, assignmentId: string, actorId: string): Promise<EmployeeAssignmentsDto> {
    await this.reach.find(ctx, employeeId, CorePermission.EmployeesAssignChange);
    const row = await this.repo.findById(assignmentId);
    if (!row || row.employeeId !== employeeId) throw new NotFoundError('Assignment', assignmentId);
    await this.tx.run(async (tx) => {
      await this.repo.lockEmployee(employeeId, tx);
      const periods = await this.repo.history(employeeId, row.field, tx);
      const target = periods.find((p) => p.id === row.id);
      if (!target || target.appliedAt || target.validFrom <= todayInRiyadh()) throw new AssignmentNotPendingError();
      const previous = periods.find((p) => p.validTo === dayBefore(target.validFrom));
      await this.repo.remove(target.id, tx);
      if (previous) await this.repo.close(previous.id, target.validTo, tx);
    });
    this.auditor.record(actorId, EMPLOYEE_AUDIT.assignmentCancelled, employeeId, { field: row.field, validFrom: row.validFrom });
    return this.dto(await this.repo.history(employeeId));
  }

  /**
   * Writes the changes to history inside the caller's transaction. A field whose value is already the last one is skipped.
   * The caller writes `appliedNow` to the employee record (the form already does, the change endpoint does it itself).
   */
  async record(employee: Employee, change: PlacementChange, when: ChangeWhen, tx: TransactionContext): Promise<RecordedChange> {
    await this.repo.lockEmployee(employee.id, tx);
    const today = todayInRiyadh();
    const result: RecordedChange = { recorded: [], appliedNow: {} };
    for (const column of Object.keys(change) as AssignmentColumn[]) {
      const value = change[column] ?? null;
      const periods = await this.periodsOf(employee, FIELD_OF[column], tx);
      if (periods.length && valueOf(periods[periods.length - 1] as EmployeeAssignment) === value) continue;
      const plan = planChange(periods, when.validFrom, today);
      if (plan.closeId) await this.repo.close(plan.closeId, plan.closeTo, tx);
      const values = { ...blank(FIELD_OF[column]), [VALUE_COLUMN[FIELD_OF[column]]]: value, reason: when.reason, createdBy: when.actorId, appliedAt: plan.applyNow ? new Date() : null };
      if (plan.replaceId) await this.repo.overwrite(plan.replaceId, values, tx);
      else await this.repo.insert([{ employeeId: employee.id, field: FIELD_OF[column], validFrom: when.validFrom, validTo: null, ...values }], tx);
      result.recorded.push(column);
      if (plan.applyNow) result.appliedNow[column] = value;
    }
    return result;
  }

  /** The first periods of a new employee: the placement they were given, from their start (or today when they start later). */
  async recordBaseline(employee: Employee, tx: TransactionContext): Promise<void> {
    for (const field of ['org_node', 'job_title', 'manager'] as const) await this.periodsOf(employee, field, tx);
  }

  /** Writes to the employee records the changes whose day has come. Idempotent: a change is applied once. */
  async applyDue(today: string = todayInRiyadh()): Promise<number> {
    const due = await this.repo.due(today);
    let applied = 0;
    for (const row of due) {
      try {
        await this.applyOne(row);
        applied += 1;
      } catch (error) {
        // One failing row must not stall the rows behind it: it stays due and is tried again at the next run.
        this.logger.error(`Placement change ${row.id} could not be applied: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (applied) this.logger.log(`Applied ${applied} placement change(s) that started`);
    return applied;
  }

  private async applyOne(row: EmployeeAssignment): Promise<void> {
    const column = ASSIGNMENT_COLUMN[row.field];
    await this.tx.run(async (tx) => {
      await this.employees.update(row.employeeId, { [column]: valueOf(row) }, tx);
      await this.repo.markApplied(row.id, new Date(), tx);
    });
    const employee = await this.employees.findById(row.employeeId);
    if (employee) await this.announce(employee.userId, true);
    this.auditor.record(null, EMPLOYEE_AUDIT.assignmentApplied, row.employeeId, { field: row.field, validFrom: row.validFrom });
  }

  // ------------------------------------------------------------------ helpers
  /** The history of one field; for an employee who has none yet (created before this feature) the stored value becomes its first period. */
  private async periodsOf(employee: Employee, field: AssignmentField, tx: TransactionContext): Promise<EmployeeAssignment[]> {
    const stored = await this.repo.history(employee.id, field, tx);
    if (stored.length) return stored;
    const value = employee[ASSIGNMENT_COLUMN[field]];
    if (value === null && field !== 'manager') return [];
    const today = todayInRiyadh();
    const from = employee.startDate < today ? employee.startDate : today;
    const row = { employeeId: employee.id, field, validFrom: from, validTo: null, reason: BASELINE_REASON, createdBy: null, appliedAt: new Date(), ...blank(field), [VALUE_COLUMN[field]]: value };
    return this.repo.insert([row], tx);
  }

  /** The unit must accept the title, and the manager must not make a loop; checked on the values that will hold together. */
  private async assertValid(employee: Employee, change: PlacementChange, history: EmployeeAssignment[]): Promise<void> {
    if (change.orgNodeId !== undefined || change.jobTitleId !== undefined) {
      const orgNodeId = change.orgNodeId ?? latest(history, 'org_node', employee.orgNodeId);
      const jobTitleId = change.jobTitleId ?? latest(history, 'job_title', employee.jobTitleId);
      if (orgNodeId && jobTitleId) await this.org.assertPlacement({ companyId: employee.companyId, orgNodeId, jobTitleId });
    }
    if (change.managerId) await this.validation.assertManager(change.managerId, employee.id);
  }

  /** The periods with the names of their values and of who made them (units by their path). */
  private async dto(rows: EmployeeAssignment[]): Promise<EmployeeAssignmentsDto> {
    const today = todayInRiyadh();
    const idsOf = (field: AssignmentField) => [...new Set(rows.filter((r) => r.field === field).map((r) => valueOf(r)).filter((v): v is string => !!v))];
    const [nodes, titles, people] = await Promise.all([
      this.org.describeNodes(idsOf('org_node')),
      this.org.describeTitles(idsOf('job_title')),
      this.repo.peopleNames(idsOf('manager'), [...new Set(rows.map((r) => r.createdBy).filter((v): v is string => !!v))]),
    ]);
    return { items: rows.map((row) => toAssignmentDto(row, today, periodNames(row, { nodes, titles, people }))) };
  }

  /** The access of the person and the auto-roles (job-title role, manager role) follow the new placement. */
  private async announce(userId: string, applied: boolean): Promise<void> {
    if (!applied) return;
    this.events.emit(ACCESS_CHANGED, { userId });
    await this.events.emitAsync(EMPLOYEES_CHANGED);
  }
}

/** The names of the fields an audit entry says it changed (`fields` for an edit, `field` for a placement change). */
function fieldsOf(changes: Record<string, unknown> | null): string[] {
  const fields = changes?.fields ?? changes?.field;
  if (Array.isArray(fields)) return fields.map(String);
  return typeof fields === 'string' ? [fields] : [];
}

interface NameSources {
  nodes: Awaited<ReturnType<OrgDirectoryService['describeNodes']>>;
  titles: Awaited<ReturnType<OrgDirectoryService['describeTitles']>>;
  people: PeopleNames;
}

/** The name of the value a period holds, in both languages (units by their path), or null for "no value". */
function valueName(row: EmployeeAssignment, from: NameSources): BilingualName | null {
  const id = valueOf(row);
  if (!id) return null;
  if (row.field === 'org_node') {
    const node = from.nodes.get(id);
    return node ? { nameAr: node.pathAr, nameEn: node.pathEn } : null;
  }
  const named = row.field === 'job_title' ? from.titles.get(id) : from.people.managers.get(id);
  return named ? { nameAr: named.nameAr, nameEn: named.nameEn } : null;
}

function periodNames(row: EmployeeAssignment, from: NameSources): PeriodNames {
  return { value: valueName(row, from), createdByName: row.createdBy ? (from.people.users.get(row.createdBy) ?? null) : null };
}

const BASELINE_REASON = 'Placement at the start of history';

const blank = (field: AssignmentField): Partial<Record<(typeof VALUE_COLUMN)[AssignmentField], null>> => ({ [VALUE_COLUMN[field]]: null });

function placementOf(input: ChangeAssignmentsInput): PlacementChange {
  const change: PlacementChange = {};
  if (input.orgNodeId !== undefined) change.orgNodeId = input.orgNodeId;
  if (input.jobTitleId !== undefined) change.jobTitleId = input.jobTitleId;
  if (input.managerId !== undefined) change.managerId = input.managerId;
  return change;
}

/** The last value of a field: the newest period (a waiting one included), or the stored one when there is no history. */
function latest(history: EmployeeAssignment[], field: AssignmentField, stored: string | null): string | null {
  const rows = history.filter((h) => h.field === field);
  const last = rows[rows.length - 1];
  return last ? valueOf(last) : stored;
}
