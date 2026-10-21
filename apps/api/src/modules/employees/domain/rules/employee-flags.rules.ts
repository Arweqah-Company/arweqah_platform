import { matchesIdRule, type CreateEmployeeInput } from '@arweqah-platform/shared';
import { FieldRuleError } from '../errors/employee.errors';

export type EmployeeInput = Omit<CreateEmployeeInput, 'roleIds'>;

/** Option flags the rules depend on, read from the seeded lookup tables (never hard-coded). */
export interface RuleLookups {
  contractType: { requiresEndDate: boolean; isOther: boolean } | null;
  idType: {
    requiresCountry: boolean;
    rules: { countryId: string | null; regex: string; minLength: number; maxLength: number; messageAr: string; messageEn: string }[];
  } | null;
  terminationReasonIsOther: boolean | null;
}

const fail = (path: string, en: string, ar: string): never => {
  throw new FieldRuleError(path, en, { ar, en });
};

/**
 * Flag-based rules of the employee form. The API is the final authority: anything the client hid
 * because of a flag is saved as null even if it was sent, and required-by-flag fields are enforced.
 */
export function applyFlagRules(input: EmployeeInput, lookups: RuleLookups): EmployeeInput {
  const contract = contractFields(input, lookups);
  const termination = terminationFields(input, lookups);
  assertIdNumber(input, lookups);
  return {
    ...input,
    ...contract,
    ...termination,
    gosiCompanyId: input.isGosiRegistered ? (input.gosiCompanyId ?? null) : null,
    gosiRegistrationDate: input.isGosiRegistered ? (input.gosiRegistrationDate ?? null) : null,
    gosiSystemId: input.isGosiRegistered ? (input.gosiSystemId ?? null) : null,
    healthInsuranceCompanyId: input.hasMedicalInsurance ? (input.healthInsuranceCompanyId ?? null) : null,
  };
}

function contractFields(input: EmployeeInput, lookups: RuleLookups): Pick<EmployeeInput, 'contractTypeOther'> {
  const type = lookups.contractType;
  if (!input.contractTypeId || !type) return { contractTypeOther: null };
  if (type.requiresEndDate && !input.endDate) fail('endDate', 'End date is required for this contract type', 'تاريخ النهاية مطلوب لهذا النوع من العقود');
  if (!type.isOther) return { contractTypeOther: null };
  if (!input.contractTypeOther) fail('contractTypeOther', 'Describe the contract type', 'اذكر نوع العقد');
  return { contractTypeOther: input.contractTypeOther };
}

function terminationFields(input: EmployeeInput, lookups: RuleLookups): Pick<EmployeeInput, 'terminationReasonOther'> {
  if (!input.terminationReasonId || !lookups.terminationReasonIsOther) return { terminationReasonOther: null };
  if (!input.terminationReasonOther) fail('terminationReasonOther', 'State the reason', 'اذكر السبب');
  return { terminationReasonOther: input.terminationReasonOther };
}

/** The rule comes from the ID type, and from the nationality too for types such as the home-country or GCC ID. */
function assertIdNumber(input: EmployeeInput, lookups: RuleLookups): void {
  const type = lookups.idType;
  if (!input.idTypeId || !input.idNumber || !type) return;
  if (type.requiresCountry && !input.nationalityId) fail('nationalityId', 'Nationality is required for this ID type', 'الجنسية مطلوبة لهذا النوع من الهويات');
  const rule = type.rules.find((r) => r.countryId !== null && r.countryId === input.nationalityId) ?? type.rules.find((r) => r.countryId === null);
  if (rule && !matchesIdRule(input.idNumber, rule)) throw new FieldRuleError('idNumber', rule.messageEn, { ar: rule.messageAr, en: rule.messageEn });
}
