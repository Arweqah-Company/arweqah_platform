import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { OwnProfileDto, OwnProfileInput } from '@arweqah-platform/shared';
import { TransactionRunner } from '../../../../common/application/transaction-runner';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { AccountPreferencesService } from '../../../../core/auth/application/account-preferences.service';
import type { AccessContext } from '../../../../core/access/domain/access-context';
import { EmployeeEditPolicy } from '../policies/employee-edit.policy';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { Employee } from '../../domain/entities/employee.entity';
import { FieldNotEditableError, FieldRuleError } from '../../domain/errors/employee.errors';
import { EMPLOYEE_AUDIT } from '../messages/employee.messages';
import { EmployeeTransformer } from '../transformers/employee.transformer';

const CONTACT_FIELDS = ['personalPhone', 'personalEmail', 'fullNameEn'] as const;

/** A person's own page: their preferences and the few details of their employee record they may change themselves. */
@Injectable()
export class EmployeeProfileService {
  constructor(
    private readonly employees: EmployeeRepository,
    private readonly transformer: EmployeeTransformer,
    private readonly preferences: AccountPreferencesService,
    private readonly tx: TransactionRunner,
    private readonly events: EventEmitter2,
    private readonly editing: EmployeeEditPolicy,
  ) {}

  async get(ctx: AccessContext): Promise<OwnProfileDto> {
    const userId = ctx.userId;
    const [preferences, employee] = await Promise.all([this.preferences.get(userId), this.employees.findByUserId(userId)]);
    // Sensitive fields (ID number, IBAN, salary) are never part of the self-service page, whatever the person's permissions.
    return { preferences, employee: employee ? await this.transformer.toDto(employee, { isActive: true, sensitive: false, editableFields: this.editing.editableFields(ctx, employee) }) : null };
  }

  async update(ctx: AccessContext, input: OwnProfileInput): Promise<OwnProfileDto> {
    const userId = ctx.userId;
    const employee = await this.employees.findByUserId(userId);
    const contact = Object.fromEntries(CONTACT_FIELDS.filter((key) => input[key] !== undefined).map((key) => [key, input[key] ?? null]));
    if (employee && contact.personalEmail && String(contact.personalEmail).toLowerCase() === employee.workEmail) {
      throw new FieldRuleError('personalEmail', 'Must differ from the work email', { ar: 'يجب أن يختلف عن بريد العمل', en: 'Must differ from the work email' });
    }
    if (employee) this.assertEditable(ctx, employee, contact);
    const changed = await this.preferences.update(userId, { locale: input.locale, theme: input.theme });
    if (employee && Object.keys(contact).length) {
      await this.tx.run((tx) => this.employees.update(employee.id, contact, tx));
      changed.push(...Object.keys(contact));
    }
    if (changed.length) this.audit(userId, employee?.id ?? userId, changed);
    return this.get(ctx);
  }

  /** The details a person changes on their own page are the ones their grants of «edit employees» give them for their own record (FR-94). */
  private assertEditable(ctx: AccessContext, employee: Employee, contact: Record<string, unknown>): void {
    const blocked = this.editing.blocked(ctx, employee, Object.keys(contact));
    if (blocked.length) throw new FieldNotEditableError(blocked);
  }

  /** Field names only: values (a phone number, an address) never go to the audit log. */
  private audit(actorId: string, entityId: string, fields: string[]): void {
    const event: AuditEvent = { actorId, action: EMPLOYEE_AUDIT.profileUpdated, entityType: 'employee', entityId, changes: { fields } };
    this.events.emit(AUDIT_EVENT, event);
  }
}
