import { createEmployeeSchema, type CreateEmployeeInput, type OrgReferenceDto } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import { ApiError, apiClient } from '@/core/api/api-client';
import { flagDuplicates, RowChecker, zodMessages, type Choice } from '@/shared/data-exchange/mapping';
import type { PreparedRow, SheetRow } from '@/shared/data-exchange/types';

export const REQUIRED = ['companyId', 'orgNodeId', 'jobTitleId', 'workEmail', 'employeeNumber', 'fullName', 'startDate'];
export const YES_NO = ['isGosiRegistered', 'isQiwaContract', 'hasMedicalInsurance'];
const CHOICE_FIELDS = ['relationTypeId', 'workCountryId', 'nationalityId', 'maritalStatusId', 'residencyStatusId', 'idTypeId', 'contractTypeId', 'gosiSystemId', 'salaryCurrencyCountryId', 'contractCompanyId', 'gosiCompanyId', 'healthInsuranceCompanyId'];
const NUMBER_CODED = ['gender', 'workMode'];
const TEXT = ['workLocation', 'workEmail', 'personalEmail', 'workPhone', 'personalPhone', 'employeeNumber', 'fullName', 'fullNameEn', 'idNumber', 'contractTypeOther', 'profession', 'iban', 'notes'];
const DATES = ['birthDate', 'idExpiryDate', 'startDate', 'endDate', 'gosiRegistrationDate'];

export interface UnitChoice extends Choice {
  titles: Choice[];
}

export interface EmployeeImportContext {
  /** The option lists by column id (companies, countries, genders…). */
  lists: Record<string, Choice[]>;
  reference: OrgReferenceDto[];
  headers: Record<string, string>;
  t: TFunction;
}

/** The units a company offers, as choices matched by Arabic or English path. */
export function unitsOf(reference: OrgReferenceDto[], companyId: string | null): UnitChoice[] {
  const units = reference.find((c) => c.companyId === companyId)?.units ?? [];
  return units.map((u) => ({ id: u.id, labels: [u.pathAr, u.pathEn], titles: u.titles.map((x) => ({ id: x.id, labels: [x.nameAr, x.nameEn] })) }));
}

/** Company, unit and job title depend on each other: the unit must belong to the company, the title to the unit. */
function placement(check: RowChecker, ctx: EmployeeImportContext): Record<string, string | null> {
  const companyId = check.choice('companyId', ctx.lists.companyId as Choice[], true);
  const units = unitsOf(ctx.reference, companyId);
  const orgNodeId = check.choice('orgNodeId', units, true);
  const jobTitleId = check.choice('jobTitleId', units.find((u) => u.id === orgNodeId)?.titles ?? [], true);
  return { companyId, orgNodeId, jobTitleId };
}

function draftOf(check: RowChecker, ctx: EmployeeImportContext): Record<string, unknown> {
  const draft: Record<string, unknown> = { ...placement(check, ctx) };
  for (const id of CHOICE_FIELDS) draft[id] = check.choice(id, ctx.lists[id] as Choice[]);
  for (const id of NUMBER_CODED) {
    const code = check.choice(id, ctx.lists[id] as Choice[]);
    draft[id] = code === null ? null : Number(code);
  }
  for (const id of TEXT) draft[id] = check.text(id, REQUIRED.includes(id));
  for (const id of DATES) draft[id] = check.date(id, REQUIRED.includes(id));
  for (const id of YES_NO) draft[id] = check.yesNo(id) ?? false;
  draft.monthlyGrossSalary = check.number('monthlyGrossSalary');
  return draft;
}

/** Looks the direct manager up by employee number, then creates the employee (the API stays the final authority). */
async function createEmployee(input: CreateEmployeeInput, managerNumber: string): Promise<void> {
  let managerId: string | null = null;
  if (managerNumber) {
    const found = await apiClient.get<{ id: string; employeeNumber: string }[]>('/employees/managers', { search: managerNumber });
    managerId = found.find((m) => m.employeeNumber === managerNumber)?.id ?? null;
    if (!managerId) throw new ApiError(422, 'MANAGER_NOT_FOUND', 'Direct manager not found');
  }
  await apiClient.post('/employees', { ...input, managerId });
}

/** Checks every row of the file: cell by cell, then the shared employee schema, then duplicates inside the file. */
export function prepareEmployeeRows(rows: SheetRow[], ctx: EmployeeImportContext): PreparedRow[] {
  const column = (id: string) => ctx.headers[id] as string;
  const emails = flagDuplicates(rows.map((r) => ({ rowNumber: r.rowNumber, value: r.cells.workEmail?.toLowerCase() || null })), column('workEmail'), ctx.t);
  const numbers = flagDuplicates(rows.map((r) => ({ rowNumber: r.rowNumber, value: r.cells.employeeNumber || null })), column('employeeNumber'), ctx.t);
  return rows.map((row) => {
    const check = new RowChecker(ctx.t, row.cells, ctx.headers);
    const parsed = createEmployeeSchema.safeParse(draftOf(check, ctx));
    const schemaErrors = check.errors.length || parsed.success ? [] : zodMessages(parsed.error, ctx.headers, ctx.t);
    const errors = [...check.errors, ...schemaErrors, ...[emails.get(row.rowNumber), numbers.get(row.rowNumber)].filter((e): e is string => !!e)];
    const data = parsed.success ? parsed.data : null;
    return { rowNumber: row.rowNumber, errors, run: !errors.length && data ? () => createEmployee(data, row.cells.managerNumber ?? '') : undefined };
  });
}
