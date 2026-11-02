import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CorePermission,
  EMPLOYEE_TERMINATED_TOPIC,
  todayIso,
  type AssignEmployeeRolesInput,
  type CreateEmployeeInput,
  type CreateEmployeeResultDto,
  type EmployeeDto,
  type EmployeeListItemDto,
  type EmployeesQuery,
  type EmployeesSummaryDto,
  type InviteResultDto,
  type ManagerOptionDto,
  type ManagerSearchQuery,
  type Paginated,
  type TerminateEmployeeInput,
  type UpdateEmployeeInput,
} from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { ForbiddenError, NotFoundError } from '../../../../common/domain/domain-error';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import { AllowedEmailDomainsService } from '../../../../core/auth/application/allowed-email-domains.service';
import { EmailDomainNotAllowedError } from '../../../../core/auth/domain/errors-email-domain';
import { todayInRiyadh } from '../../../../common/domain/riyadh-date';
import { ACCESS_CHANGED, EMPLOYEES_CHANGED } from '../../../../core/access/application/access.events';
import { UserAccessService } from '../../../../core/access/application/user-access.service';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { Outbox } from '../../../../core/messaging/application/outbox';
import { AuthenticatorService } from '../../../../core/auth/application/authenticator.service';
import { IdentityProvider } from '../../../../core/auth/application/identity-provider';
import { InvitationService } from '../../../../core/auth/application/invitation.service';
import { LookupsService } from '../../../lookups/application/services/lookups.service';
import type { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import { FieldRuleError, SelfActionError } from '../../domain/errors/employee.errors';
import { EmployeeTransformer } from '../transformers/employee.transformer';
import type { EmployeeInput } from '../../domain/rules/employee-flags.rules';
import { EmployeeValidationService } from './employee-validation.service';
import { EMPLOYEE_AUDIT } from '../messages/employee.messages';

const P = CorePermission;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly repo: EmployeeRepository,
    private readonly validation: EmployeeValidationService,
    private readonly transformer: EmployeeTransformer,
    private readonly ability: AbilityFactory,
    private readonly access: UserAccessService,
    private readonly identity: IdentityProvider,
    private readonly invitations: InvitationService,
    private readonly authenticator: AuthenticatorService,
    private readonly lookups: LookupsService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
    private readonly outbox: Outbox,
    private readonly emailDomains: AllowedEmailDomainsService,
  ) {}

  async list(ctx: AccessContext, query: EmployeesQuery): Promise<Paginated<EmployeeListItemDto>> {
    const scope = ctx.filterFor(P.EmployeesView);
    if (!scope) throw new ForbiddenError();
    const { items, total } = await this.repo.list(query, scope);
    const states = await this.repo.activeStates(items.map((e) => e.userId));
    return { items: await this.transformer.toListItems(items, states), total, page: query.page, pageSize: query.pageSize };
  }

  /** Dashboard counts for the employees the viewer may see. Documents and contracts count as "soon" within 30 days. */
  async summary(ctx: AccessContext): Promise<EmployeesSummaryDto> {
    const scope = ctx.filterFor(P.EmployeesView);
    if (!scope) throw new ForbiddenError();
    const today = todayIso();
    const soonUntil = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    return this.repo.summary(scope, { today, soonUntil });
  }

  async get(ctx: AccessContext, id: string): Promise<EmployeeDto> {
    return this.dto(ctx, await this.mustFind(ctx, id, P.EmployeesView));
  }

  /** Creates the person's record and sign-in account, assigns roles, then e-mails the activation link. */
  async create(ctx: AccessContext, input: CreateEmployeeInput, actorId: string): Promise<CreateEmployeeResultDto> {
    const { roleIds: chosen, roleExpiries, ...fields } = input;
    this.assertInScope(ctx, P.EmployeesCreate, { companyId: input.companyId, orgNodeId: input.orgNodeId });
    await this.assertEmailDomainAllowed(input.workEmail);
    const defaults = await this.access.defaultRoleIds(input.jobTitleId);
    const roleIds = chosen ?? defaults.ids;
    this.assertRoleExpiries(roleIds, roleExpiries);
    // The default roles come with the new person whoever adds them; naming roles is the permission to assign them.
    if (chosen?.length) await this.assertCanAssignRoles(ctx, roleIds, { companyId: input.companyId, orgNodeId: input.orgNodeId }, defaults.ids);
    const { values } = await this.validation.prepare(ctx, fields);
    const userId = await this.identity.createUser({ name: input.fullName, email: input.workEmail, locale: 'ar' });
    let created: Employee;
    try {
      created = await this.tx.run(async (tx) => {
        const row = await this.repo.insert({ ...values, userId, createdBy: actorId }, tx);
        if (roleIds.length) await this.access.replaceRoles(userId, roleIds, { expiries: roleExpiries, grantedBy: actorId }, tx);
        return row;
      });
    } catch (error) {
      await this.identity.deleteUser(userId);
      throw error;
    }
    await this.events.emitAsync(EMPLOYEES_CHANGED);
    this.audit(actorId, EMPLOYEE_AUDIT.created, created.id, { companyId: created.companyId, roles: roleIds.length });
    return { employee: await this.dto(ctx, created), invitation: await this.invite(userId) };
  }

  async update(ctx: AccessContext, id: string, input: UpdateEmployeeInput, actorId: string): Promise<EmployeeDto> {
    const existing = await this.mustFind(ctx, id, P.EmployeesUpdate);
    if (input.workEmail && input.workEmail !== existing.workEmail) {
      throw new FieldRuleError('workEmail', 'The work email is the sign-in identity and cannot be changed here', { ar: 'بريد العمل هو هوية الدخول ولا يمكن تغييره من هنا', en: 'The work email is the sign-in identity and cannot be changed here' });
    }
    this.assertInScope(ctx, P.EmployeesUpdate, { companyId: input.companyId, orgNodeId: input.orgNodeId, ownerId: existing.userId });
    const fields: EmployeeInput = { ...input, workEmail: existing.workEmail };
    const { values } = await this.validation.prepare(ctx, fields, existing);
    await this.tx.run((tx) => this.repo.update(id, values, tx));
    await this.restoreAccessIfEndMoved(ctx, existing, values.endDate ?? null, actorId);
    this.events.emit(ACCESS_CHANGED, { userId: existing.userId });
    await this.events.emitAsync(EMPLOYEES_CHANGED);
    this.audit(actorId, EMPLOYEE_AUDIT.updated, id, { fields: changedFields(existing, values) });
    return this.dto(ctx, (await this.repo.findById(id)) as Employee);
  }

  /** Sign-in ended by the contract coming back when the end date is removed or moved to today or later, for who may switch an account on. */
  private async restoreAccessIfEndMoved(ctx: AccessContext, existing: Employee, endDate: string | null, actorId: string): Promise<void> {
    if (!existing.accessEndedAt || (endDate !== null && endDate < todayInRiyadh())) return;
    if (!this.ability.can(ctx, P.EmployeesDeactivate, { companyId: existing.companyId, orgNodeId: existing.orgNodeId, ownerId: existing.userId })) return;
    await this.identity.setActive(existing.userId, true);
    await this.repo.setAccessEnded(existing.id, null);
    this.audit(actorId, EMPLOYEE_AUDIT.accessRestored, existing.id, { endDate });
  }

  async setActive(ctx: AccessContext, id: string, active: boolean, actorId: string): Promise<EmployeeDto> {
    const employee = await this.mustFind(ctx, id, P.EmployeesDeactivate);
    if (!active && employee.userId === ctx.userId) throw new SelfActionError('You cannot deactivate your own account');
    await this.identity.setActive(employee.userId, active);
    this.events.emit(ACCESS_CHANGED, { userId: employee.userId });
    this.audit(actorId, active ? EMPLOYEE_AUDIT.activated : EMPLOYEE_AUDIT.deactivated, id, {});
    return this.dto(ctx, employee);
  }

  /** Ends the relationship: end date and reason are recorded; the account stops signing in the day after the end date. */
  async terminate(ctx: AccessContext, id: string, input: TerminateEmployeeInput, actorId: string): Promise<EmployeeDto> {
    const employee = await this.mustFind(ctx, id, P.EmployeesTerminate);
    if (employee.userId === ctx.userId) throw new SelfActionError('You cannot end your own contract');
    if (input.endDate <= employee.startDate) throw new FieldRuleError('endDate', 'The end date must be after the start date', { ar: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية', en: 'The end date must be after the start date' });
    const isOther = await this.lookups.terminationReasonIsOther(input.terminationReasonId);
    if (isOther === null) throw new FieldRuleError('terminationReasonId', 'Unknown option');
    if (isOther && !input.terminationReasonOther) throw new FieldRuleError('terminationReasonOther', 'State the reason', { ar: 'اذكر السبب', en: 'State the reason' });
    await this.tx.run(async (tx) => {
      await this.repo.update(id, { endDate: input.endDate, terminationReasonId: input.terminationReasonId, terminationReasonOther: isOther ? (input.terminationReasonOther ?? null) : null }, tx);
      await this.outbox.enqueue(EMPLOYEE_TERMINATED_TOPIC, { employeeId: id, userId: employee.userId, endDate: input.endDate }, tx);
    });
    if (input.endDate < todayInRiyadh()) {
      await this.identity.setActive(employee.userId, false);
      await this.repo.setAccessEnded(id, new Date());
    }
    this.audit(actorId, EMPLOYEE_AUDIT.terminated, id, { endDate: input.endDate });
    return this.dto(ctx, (await this.repo.findById(id)) as Employee);
  }

  async assignRoles(ctx: AccessContext, id: string, input: AssignEmployeeRolesInput, actorId: string): Promise<EmployeeDto> {
    const { roleIds, roleExpiries } = input;
    this.assertRoleExpiries(roleIds, roleExpiries);
    const employee = await this.mustFind(ctx, id, P.EmployeesAssignRoles);
    if (employee.userId === ctx.userId) throw new SelfActionError('You cannot change your own roles');
    await this.assertCanAssignRoles(ctx, roleIds, { companyId: employee.companyId, orgNodeId: employee.orgNodeId, ownerId: employee.userId }, (await this.access.defaultRoleIds(employee.jobTitleId)).ids);
    await this.tx.run((tx) => this.access.replaceRoles(employee.userId, roleIds, { expiries: roleExpiries, grantedBy: actorId }, tx));
    await this.events.emitAsync(EMPLOYEES_CHANGED);
    this.audit(actorId, EMPLOYEE_AUDIT.rolesChanged, id, { roleIds, withEndDate: Object.keys(roleExpiries ?? {}).length });
    return this.dto(ctx, employee);
  }

  async assignGroups(ctx: AccessContext, id: string, groupIds: string[], actorId: string): Promise<EmployeeDto> {
    const employee = await this.mustFind(ctx, id, P.EmployeesAssignGroups);
    if (employee.userId === ctx.userId) throw new SelfActionError('You cannot change your own groups');
    if (!this.ability.can(ctx, P.EmployeesAssignGroups, { companyId: employee.companyId, orgNodeId: employee.orgNodeId, ownerId: employee.userId })) throw new ForbiddenError();
    await this.access.assertGroupsGrantable(ctx, groupIds);
    await this.tx.run((tx) => this.access.replaceGroups(employee.userId, groupIds, actorId, tx));
    this.audit(actorId, EMPLOYEE_AUDIT.groupsChanged, id, { groupIds });
    return this.dto(ctx, employee);
  }

  async resendInvite(ctx: AccessContext, id: string, actorId: string): Promise<InviteResultDto> {
    const employee = await this.mustFind(ctx, id, P.EmployeesResendInvite);
    this.audit(actorId, EMPLOYEE_AUDIT.invited, id, {});
    return this.invite(employee.userId);
  }

  /** Lost phone: the employee links the app again through a new invitation; their sessions end now. */
  async resetAuthenticator(ctx: AccessContext, id: string, actorId: string): Promise<InviteResultDto> {
    const employee = await this.mustFind(ctx, id, P.EmployeesResetAuthenticator);
    if (employee.userId === ctx.userId) throw new SelfActionError('Use the security page to manage your own authenticator');
    await this.authenticator.reset(employee.userId, actorId);
    await this.identity.revokeAllSessions(employee.userId);
    return this.invite(employee.userId);
  }

  managers(query: ManagerSearchQuery): Promise<ManagerOptionDto[]> {
    return this.repo.searchManagers(query.search, query.excludeId);
  }

  // ------------------------------------------------------------------ helpers
  /** A record outside the actor's reach does not exist for them (404), whatever the permission. */
  private async mustFind(ctx: AccessContext, id: string, key: string): Promise<Employee> {
    const employee = await this.repo.findById(id);
    const visible = employee && this.ability.can(ctx, key, { ownerId: employee.userId, companyId: employee.companyId, orgNodeId: employee.orgNodeId });
    if (!employee || !visible) throw new NotFoundError('Employee', id);
    return employee;
  }

  private assertInScope(ctx: AccessContext, key: string, resource: { companyId: string; orgNodeId: string; ownerId?: string }): void {
    if (!this.ability.can(ctx, key, resource)) throw new NotFoundError('Org unit', resource.orgNodeId);
  }

  /** The work e-mail must use a domain the administrator allows (no rule while the list is empty). */
  private async assertEmailDomainAllowed(email: string): Promise<void> {
    try {
      await this.emailDomains.assertAllowed(email);
    } catch (error) {
      if (!(error instanceof EmailDomainNotAllowedError)) throw error;
      throw new FieldRuleError('workEmail', error.message, { ar: 'نطاق هذا البريد غير مسموح به في المنصة', en: 'The platform does not allow this e-mail domain' });
    }
  }

  /** An end date is for a role the person is given, and is today or later (Riyadh); null removes it. */
  private assertRoleExpiries(roleIds: string[], expiries: Record<string, string | null> | undefined): void {
    const today = todayInRiyadh();
    for (const [roleId, day] of Object.entries(expiries ?? {})) {
      if (!roleIds.includes(roleId)) throw new FieldRuleError('roleExpiries', 'An end date is for a role the person is given', { ar: 'تاريخ الانتهاء لدور يُمنح للموظف فقط', en: 'An end date is for a role the person is given' });
      if (day !== null && day < today) throw new FieldRuleError('roleExpiries', 'The end date cannot be in the past', { ar: 'تاريخ الانتهاء لا يكون في الماضي', en: 'The end date cannot be in the past' });
    }
  }

  /** Nobody gives more than they hold, except the Employee role and the role of the person's own job title (checked when they were made). */
  private async assertCanAssignRoles(ctx: AccessContext, roleIds: string[], resource: { companyId: string; orgNodeId: string | null; ownerId?: string }, exempt: readonly string[]): Promise<void> {
    if (!this.ability.can(ctx, P.EmployeesAssignRoles, resource)) throw new ForbiddenError();
    await this.access.assertGrantable(ctx, roleIds, exempt);
  }

  private async dto(ctx: AccessContext, employee: Employee): Promise<EmployeeDto> {
    const states = await this.repo.activeStates([employee.userId]);
    const sensitive = this.validation.canHandleSensitive(ctx, { ownerId: employee.userId, companyId: employee.companyId, orgNodeId: employee.orgNodeId });
    return this.transformer.toDto(employee, { isActive: states.get(employee.userId) ?? false, sensitive });
  }

  /** A mail failure must not undo the employee: the record exists and the link can be re-sent. */
  private async invite(userId: string): Promise<InviteResultDto> {
    try {
      return { sent: true, ...(await this.invitations.invite(userId)) };
    } catch (error) {
      this.logger.error('Invitation e-mail failed', error as Error);
      return { sent: false, sentTo: '' };
    }
  }

  private audit(actorId: string, action: string, entityId: string, changes: Record<string, unknown>): void {
    const event: AuditEvent = { actorId, action, entityType: 'employee', entityId, changes };
    this.events.emit(AUDIT_EVENT, event);
  }
}

/** Names of the fields that changed (never their values, which may be sensitive). */
function changedFields(existing: Employee, values: Record<string, unknown>): string[] {
  const current = existing as unknown as Record<string, unknown>;
  return Object.keys(values).filter((key) => values[key] !== current[key] && !(key.endsWith('Enc') && key !== 'idNumberEnc' && key !== 'ibanEnc' && key !== 'monthlyGrossSalaryEnc')).map((key) => key.replace(/Enc$/, '').replace(/Hash$/, ''));
}
