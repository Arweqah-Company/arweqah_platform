import { z } from 'zod';

export const EMPLOYEE_FIELD_GROUPS = ['personal', 'contact', 'work', 'identity', 'contract', 'salary', 'notes'] as const;
export type EmployeeFieldGroup = (typeof EMPLOYEE_FIELD_GROUPS)[number];

interface FieldDef {
  key: string;
  group: EmployeeFieldGroup;
  /** A field the person can never be allowed to change themselves (identity, contract, pay): the server refuses to switch it on. */
  neverSelf?: true;
}

/**
 * The details of an employee whose editor can be chosen (FR-94): the person themselves, HR, or only the platform administrator.
 * The unit, job title, manager, company, relation type, dates of service, work e-mail and number are always HR's and are not listed.
 */
export const EMPLOYEE_FIELDS: readonly FieldDef[] = [
  { key: 'fullNameEn', group: 'personal' },
  { key: 'gender', group: 'personal' },
  { key: 'birthDate', group: 'personal' },
  { key: 'nationalityId', group: 'personal' },
  { key: 'maritalStatusId', group: 'personal' },
  { key: 'residencyStatusId', group: 'personal' },
  { key: 'workPhone', group: 'contact' },
  { key: 'personalPhone', group: 'contact' },
  { key: 'personalEmail', group: 'contact' },
  { key: 'workLocation', group: 'work' },
  { key: 'workCountryId', group: 'work' },
  { key: 'workMode', group: 'work' },
  { key: 'profession', group: 'work' },
  { key: 'fullName', group: 'identity', neverSelf: true },
  { key: 'idTypeId', group: 'identity', neverSelf: true },
  { key: 'idNumber', group: 'identity', neverSelf: true },
  { key: 'idExpiryDate', group: 'identity', neverSelf: true },
  { key: 'contractTypeId', group: 'contract', neverSelf: true },
  { key: 'contractTypeOther', group: 'contract', neverSelf: true },
  { key: 'contractCompanyId', group: 'contract', neverSelf: true },
  { key: 'isGosiRegistered', group: 'contract', neverSelf: true },
  { key: 'gosiCompanyId', group: 'contract', neverSelf: true },
  { key: 'gosiRegistrationDate', group: 'contract', neverSelf: true },
  { key: 'gosiSystemId', group: 'contract', neverSelf: true },
  { key: 'isQiwaContract', group: 'contract', neverSelf: true },
  { key: 'hasMedicalInsurance', group: 'contract', neverSelf: true },
  { key: 'healthInsuranceCompanyId', group: 'contract', neverSelf: true },
  { key: 'monthlyGrossSalary', group: 'salary', neverSelf: true },
  { key: 'salaryCurrencyCountryId', group: 'salary', neverSelf: true },
  { key: 'iban', group: 'salary', neverSelf: true },
  { key: 'notes', group: 'notes', neverSelf: true },
];

export const EMPLOYEE_FIELD_KEYS = EMPLOYEE_FIELDS.map((f) => f.key);
export const NEVER_SELF_EDITABLE: readonly string[] = EMPLOYEE_FIELDS.filter((f) => f.neverSelf).map((f) => f.key);

/** What a plain employee may change of their own record from the start (the rules begin as this and an administrator changes them). */
export const SELF_EDITABLE_EMPLOYEE_FIELDS = ['workPhone', 'personalPhone', 'personalEmail', 'fullNameEn'] as const;

export interface EmployeeFieldRuleDto {
  field: string;
  group: EmployeeFieldGroup;
  editableBySelf: boolean;
  editableByHr: boolean;
  /** True for a field that can never be switched on for the person themselves. */
  selfLocked: boolean;
}

export const updateFieldRulesSchema = z.strictObject({
  rules: z
    .array(z.strictObject({ field: z.enum(EMPLOYEE_FIELD_KEYS as [string, ...string[]]), editableBySelf: z.boolean(), editableByHr: z.boolean() }))
    .min(1)
    .max(EMPLOYEE_FIELDS.length),
});
export type UpdateFieldRulesInput = z.infer<typeof updateFieldRulesSchema>;

/** What the employee form needs: the fields a plain employee may change of their own record. */
export interface SelfEditableFieldsDto {
  fields: string[];
}
