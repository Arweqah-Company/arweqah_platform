import { Injectable } from '@nestjs/common';
import { CorePermission } from '@arweqah-platform/shared';
import { BlindIndex } from '../../../../common/application/blind-index';
import { FieldCipher } from '../../../../common/application/field-cipher';
import { AbilityFactory } from '../../../../core/access/application/ability.factory';
import type { AccessContext, ScopedResource } from '../../../../core/access/domain/access-context';
import { LookupsService } from '../../../lookups/application/services/lookups.service';
import { OrgDirectoryService } from '../../../org/application/services/org-directory.service';
import type { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepository } from '../../domain/contracts/employee.repository';
import type { EmployeeValues } from '../../domain/types/employee.types';
import { EmployeeEmailTakenError, EmployeeNumberTakenError, FieldRuleError, IdDocumentTakenError } from '../../domain/errors/employee.errors';
import { applyFlagRules, type EmployeeInput, type RuleLookups } from '../../domain/rules/employee-flags.rules';
import { toEmployeeValues } from '../transformers/employee-values.transformer';

const ENCRYPTED_COLUMNS = ['idNumberEnc', 'ibanEnc', 'monthlyGrossSalaryEnc'] as const;
const SENSITIVE_COLUMNS = ['idTypeId', 'idNumberEnc', 'idNumberHash', 'ibanEnc', 'monthlyGrossSalaryEnc', 'salaryCurrencyCountryId'] as const;

export interface PreparedEmployee {
  values: EmployeeValues;
  /** The actor may handle the sensitive fields (ID number, IBAN, salary) of this record. */
  sensitive: boolean;
}

/** Everything that must hold before an employee is saved: flag rules, placement, manager, uniqueness. */
@Injectable()
export class EmployeeValidationService {
  constructor(
    private readonly repo: EmployeeRepository,
    private readonly org: OrgDirectoryService,
    private readonly lookups: LookupsService,
    private readonly ability: AbilityFactory,
    private readonly cipher: FieldCipher,
    private readonly blind: BlindIndex,
  ) {}

  /** Without employees.view_sensitive the sensitive fields are neither read nor written: on update they keep their stored values. */
  canHandleSensitive(ctx: AccessContext, resource: ScopedResource): boolean {
    return this.ability.can(ctx, CorePermission.EmployeesViewSensitive, resource);
  }

  async prepare(ctx: AccessContext, input: EmployeeInput, existing?: Employee): Promise<PreparedEmployee> {
    const sensitive = this.canHandleSensitive(ctx, { ownerId: existing?.userId, companyId: input.companyId, orgNodeId: input.orgNodeId });
    const effective = sensitive ? input : { ...input, idTypeId: null, idNumber: null, iban: null, monthlyGrossSalary: null, salaryCurrencyCountryId: null };
    const ruled = applyFlagRules(effective, await this.ruleLookups(effective));
    await this.org.assertPlacement({ orgNodeId: ruled.orgNodeId, jobTitleId: ruled.jobTitleId });
    await this.assertManager(ruled.managerId ?? null, existing?.id);
    const values = toEmployeeValues(ruled, { cipher: this.cipher, blind: this.blind });
    await this.assertUnique(values, existing?.id);
    if (!sensitive) for (const column of SENSITIVE_COLUMNS) delete values[column];
    else if (existing) this.dropUnchangedSecrets(values, existing);
    return { values, sensitive };
  }

  /**
   * Every encryption uses a new random IV, so a value saved again unchanged would look different from the stored one:
   * the secrets whose plain value did not change are left out, so they are neither rewritten nor reported as a change (FR-94).
   */
  private dropUnchangedSecrets(values: EmployeeValues, existing: Employee): void {
    for (const column of ENCRYPTED_COLUMNS) {
      const next = values[column];
      const stored = existing[column];
      if (typeof next === 'string' && typeof stored === 'string' && this.cipher.decrypt(next) === this.cipher.decrypt(stored)) delete values[column];
    }
  }

  private async ruleLookups(input: EmployeeInput): Promise<RuleLookups> {
    const [contractType, idType, terminationReasonIsOther, relationLimited] = await Promise.all([
      input.contractTypeId ? this.lookups.contractTypeRule(input.contractTypeId) : null,
      input.idTypeId ? this.lookups.idTypeRules(input.idTypeId) : null,
      input.terminationReasonId ? this.lookups.terminationReasonIsOther(input.terminationReasonId) : null,
      input.relationTypeId ? this.lookups.relationTypeLimited(input.relationTypeId) : null,
    ]);
    this.assertKnown(input.contractTypeId, contractType, 'contractTypeId');
    this.assertKnown(input.idTypeId, idType, 'idTypeId');
    this.assertKnown(input.terminationReasonId, terminationReasonIsOther, 'terminationReasonId');
    this.assertKnown(input.relationTypeId, relationLimited, 'relationTypeId');
    return { contractType, idType, terminationReasonIsOther, relationLimited };
  }

  private assertKnown(id: string | null | undefined, found: unknown, path: string): void {
    if (id && found === null) throw new FieldRuleError(path, 'Unknown option', { ar: 'خيار غير موجود', en: 'Unknown option' });
  }

  /** The manager is any other employee, and never someone who reports to this employee (no loops). */
  async assertManager(managerId: string | null, selfId: string | undefined): Promise<void> {
    if (!managerId) return;
    const loop = !!selfId && (managerId === selfId || (await this.repo.reportsTo(managerId, selfId)));
    if (!(await this.repo.exists(managerId)) || loop) {
      throw new FieldRuleError('managerId', 'Choose a different direct manager', { ar: 'اختر مديرًا مباشرًا آخر', en: 'Choose a different direct manager' });
    }
  }

  /** Friendly early answers; the unique indexes still decide when two requests race. */
  private async assertUnique(values: EmployeeValues, exceptId: string | undefined): Promise<void> {
    if (values.workEmail && (await this.repo.emailTaken(values.workEmail, exceptId))) throw new EmployeeEmailTakenError();
    if (values.employeeNumber && (await this.repo.numberTaken(values.employeeNumber, exceptId))) throw new EmployeeNumberTakenError();
    if (values.idTypeId && values.idNumberHash && (await this.repo.idDocumentTaken(values.idTypeId, values.idNumberHash, exceptId))) throw new IdDocumentTakenError();
  }
}
