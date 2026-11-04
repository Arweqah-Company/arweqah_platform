import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EMPLOYEE_FIELDS, NEVER_SELF_EDITABLE, type EmployeeFieldRuleDto, type UpdateFieldRulesInput } from '@arweqah-platform/shared';
import { AUDIT_EVENT, type AuditEvent } from '../../../../core/audit/application/audit.events';
import { EmployeeFieldRuleRepository } from '../../domain/contracts/employee-field-rule.repository';
import { FieldNeverSelfEditableError } from '../../domain/errors/employee.errors';
import { EMPLOYEE_AUDIT } from '../messages/employee.messages';

const GROUP_OF = new Map(EMPLOYEE_FIELDS.map((f) => [f.key, f.group]));

/** Who may change each detail of an employee (FR-94): read on every edit, so a change takes effect at once. */
@Injectable()
export class EmployeeFieldRulesService {
  constructor(
    private readonly rules: EmployeeFieldRuleRepository,
    private readonly events: EventEmitter2,
  ) {}

  async list(): Promise<EmployeeFieldRuleDto[]> {
    const rows = await this.rules.all();
    return rows
      .filter((r) => GROUP_OF.has(r.field))
      .map((r) => ({ field: r.field, group: GROUP_OF.get(r.field) as EmployeeFieldRuleDto['group'], editableBySelf: r.editableBySelf, editableByHr: r.editableByHr, selfLocked: NEVER_SELF_EDITABLE.includes(r.field) }));
  }

  /** The fields a plain employee may change of their own record. */
  async selfEditable(): Promise<string[]> {
    return (await this.rules.all()).filter((r) => r.editableBySelf && !NEVER_SELF_EDITABLE.includes(r.field)).map((r) => r.field);
  }

  /** The fields only a platform administrator may change (HR may not). */
  async hrLocked(): Promise<string[]> {
    return (await this.rules.all()).filter((r) => !r.editableByHr).map((r) => r.field);
  }

  async update(input: UpdateFieldRulesInput, actorId: string): Promise<EmployeeFieldRuleDto[]> {
    const forbidden = input.rules.filter((r) => r.editableBySelf && NEVER_SELF_EDITABLE.includes(r.field)).map((r) => r.field);
    if (forbidden.length) throw new FieldNeverSelfEditableError(forbidden);
    await this.rules.save(input.rules, actorId);
    const event: AuditEvent = { actorId, action: EMPLOYEE_AUDIT.fieldRulesChanged, entityType: 'employee_field_rules', entityId: null, changes: { fields: input.rules.map((r) => r.field) } };
    this.events.emit(AUDIT_EVENT, event);
    return this.list();
  }
}
