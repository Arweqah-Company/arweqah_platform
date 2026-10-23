import { createEmployeeSchema, idNumberProblem, type CreateEmployeeInput, type EmployeeDto, type IdTypeLookupDto } from '@arweqah-platform/shared';
import type { FieldErrors, Resolver } from 'react-hook-form';

/** What the inputs hold: strings (empty = not set) and booleans. Converted to the API shape on submit. */
export interface FormState {
  companyId: string;
  relationTypeId: string;
  orgNodeId: string;
  jobTitleId: string;
  managerId: string;
  workLocation: string;
  workCountryId: string;
  workMode: string;
  workEmail: string;
  personalEmail: string;
  workPhone: string;
  personalPhone: string;
  employeeNumber: string;
  fullName: string;
  fullNameEn: string;
  gender: string;
  birthDate: string;
  nationalityId: string;
  maritalStatusId: string;
  residencyStatusId: string;
  idTypeId: string;
  idNumber: string;
  idExpiryDate: string;
  startDate: string;
  endDate: string;
  contractTypeId: string;
  contractTypeOther: string;
  contractCompanyId: string;
  gosiCompanyId: string;
  healthInsuranceCompanyId: string;
  isGosiRegistered: boolean;
  gosiRegistrationDate: string;
  gosiSystemId: string;
  profession: string;
  isQiwaContract: boolean;
  hasMedicalInsurance: boolean;
  terminationReasonId: string;
  terminationReasonOther: string;
  monthlyGrossSalary: string;
  salaryCurrencyCountryId: string;
  iban: string;
  notes: string;
  roleIds: string[];
}

const TEXT_KEYS = [
  'relationTypeId', 'managerId', 'workLocation', 'workCountryId', 'personalEmail', 'workPhone', 'personalPhone', 'fullNameEn', 'birthDate', 'nationalityId',
  'maritalStatusId', 'residencyStatusId', 'idTypeId', 'idNumber', 'idExpiryDate', 'endDate', 'contractTypeId', 'contractTypeOther', 'contractCompanyId',
  'gosiCompanyId', 'healthInsuranceCompanyId', 'gosiRegistrationDate', 'gosiSystemId', 'profession', 'terminationReasonId', 'terminationReasonOther',
  'salaryCurrencyCountryId', 'iban', 'notes',
] as const;

export const EMPTY_FORM: FormState = {
  companyId: '', relationTypeId: '', orgNodeId: '', jobTitleId: '', managerId: '', workLocation: '', workCountryId: '', workMode: '', workEmail: '', personalEmail: '',
  workPhone: '', personalPhone: '', employeeNumber: '', fullName: '', fullNameEn: '', gender: '', birthDate: '', nationalityId: '', maritalStatusId: '',
  residencyStatusId: '', idTypeId: '', idNumber: '', idExpiryDate: '', startDate: '', endDate: '', contractTypeId: '', contractTypeOther: '', contractCompanyId: '',
  gosiCompanyId: '', healthInsuranceCompanyId: '', isGosiRegistered: false, gosiRegistrationDate: '', gosiSystemId: '', profession: '', isQiwaContract: false,
  hasMedicalInsurance: false, terminationReasonId: '', terminationReasonOther: '', monthlyGrossSalary: '', salaryCurrencyCountryId: '', iban: '', notes: '', roleIds: [],
};

const blank = (value: string): string | null => (value.trim() === '' ? null : value.trim());

/** The API payload; roles are given when an employee is added (later changes use the roles dialog, and the update refuses the key). */
export function toPayload(form: FormState, editing = false): Record<string, unknown> {
  const { roleIds, ...rest } = payloadFields(form);
  return editing ? rest : { ...rest, roleIds };
}

/** Empty inputs become null, numbers become numbers; unknown to the API: nothing. */
function payloadFields(form: FormState): Record<string, unknown> & { roleIds: string[] } {
  const optional = Object.fromEntries(TEXT_KEYS.map((key) => [key, blank(form[key])]));
  return {
    ...optional,
    companyId: form.companyId,
    orgNodeId: form.orgNodeId,
    jobTitleId: form.jobTitleId,
    workEmail: form.workEmail.trim(),
    employeeNumber: form.employeeNumber.trim(),
    fullName: form.fullName.trim(),
    startDate: form.startDate,
    workMode: form.workMode === '' ? null : Number(form.workMode),
    gender: form.gender === '' ? null : Number(form.gender),
    isGosiRegistered: form.isGosiRegistered,
    isQiwaContract: form.isQiwaContract,
    hasMedicalInsurance: form.hasMedicalInsurance,
    monthlyGrossSalary: blank(form.monthlyGrossSalary) === null ? null : Number(form.monthlyGrossSalary),
    roleIds: form.roleIds,
  };
}

const asText = (v: string | null | undefined): string => v ?? '';
const asChoice = (v: number | null): string => (v === null ? '' : String(v));

/** Flags and the fields whose shape differs between the API and the inputs. */
function structuralState(e: EmployeeDto): Partial<FormState> {
  return {
    companyId: e.company.id,
    orgNodeId: e.orgNode?.id ?? '',
    jobTitleId: e.jobTitle?.id ?? '',
    managerId: e.manager?.id ?? '',
    workMode: asChoice(e.workMode),
    gender: asChoice(e.gender),
    isGosiRegistered: e.isGosiRegistered,
    isQiwaContract: e.isQiwaContract,
    hasMedicalInsurance: e.hasMedicalInsurance,
    monthlyGrossSalary: e.monthlyGrossSalary === null ? '' : String(e.monthlyGrossSalary),
    roleIds: e.roles.map((r) => r.id),
  };
}

export function toFormState(e: EmployeeDto): FormState {
  const optional = Object.fromEntries(TEXT_KEYS.map((key) => [key, asText((e as unknown as Record<string, string | null>)[key])]));
  // Masked values are for display only and are never sent back.
  const sensitive = e.sensitiveHidden ? { idNumber: '', iban: '' } : { idNumber: asText(e.idNumber), iban: asText(e.iban) };
  return { ...EMPTY_FORM, ...optional, ...structuralState(e), ...sensitive, workEmail: e.workEmail, employeeNumber: e.employeeNumber, fullName: e.fullName, startDate: e.startDate };
}

/** Runs the shared zod rules (the same ones the API enforces) and maps each issue to its field. */
export const employeeResolver: Resolver<FormState> = (values) => {
  const parsed = createEmployeeSchema.safeParse(toPayload(values));
  if (parsed.success) return { values, errors: {} };
  const errors: FieldErrors<FormState> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? 'root') as keyof FormState;
    if (!errors[field]) (errors as Record<string, unknown>)[field] = { type: issue.code, message: isMissing(issue) ? 'required' : field };
  }
  return { values: {}, errors };
};

function isMissing(issue: { code: string; input?: unknown; message: string }): boolean {
  // A rule that failed on a value that is there (e.g. a wrong e-mail domain) is not "missing".
  return issue.code !== 'custom' && (issue.code === 'invalid_type' || issue.input === '' || issue.input === undefined);
}

/** The same ID-number rule as the API (type, and nationality for some types), applied while typing, in the user's language. */
export function employeeResolverWithIdRule(idTypes: IdTypeLookupDto[], language: string): Resolver<FormState> {
  return async (values, context, options) => {
    const base = await employeeResolver(values, context, options);
    const type = idTypes.find((t) => t.id === values.idTypeId);
    if (!type || !values.idNumber.trim()) return base;
    const rules = type.rules.map((r) => ({ ...r, messageAr: r.errorMessageAr, messageEn: r.errorMessageEn }));
    const problem = idNumberProblem({ idNumber: values.idNumber.trim(), nationalityId: values.nationalityId || null }, { requiresCountry: type.requiresCountry, rules });
    if (!problem || (base.errors as Record<string, unknown>)[problem.path]) return base;
    const message = language === 'en' ? problem.messageEn : problem.messageAr;
    return { values: {}, errors: { ...base.errors, [problem.path]: { type: 'rule', message } } as FieldErrors<FormState> };
  };
}

export type EmployeePayload = CreateEmployeeInput;
