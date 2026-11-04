import type { EmployeeDto, EmployeeListItemDto, Paginated } from '@arweqah-platform/shared';
import { ApiError, apiClient } from '@/core/api/api-client';
import { flagDuplicates, RowChecker, type Choice } from '@/shared/data-exchange/mapping';
import type { PreparedRow, SheetRow } from '@/shared/data-exchange/types';
import { toFormState, toPayload, type FormState } from './form/form-state';
import { unitsOf, YES_NO, type EmployeeImportContext } from './employees-import-rows';

/** Fixed in an update: who the person is, the work e-mail (their sign-in) and the company. */
export const UPDATE_EXCLUDED = ['companyId', 'workEmail'];
/** The reason stored with a placement change that came from a file. */
export const IMPORT_REASON = 'Imported from a file';

const CHOICE_FIELDS = ['relationTypeId', 'workCountryId', 'nationalityId', 'maritalStatusId', 'residencyStatusId', 'idTypeId', 'contractTypeId', 'gosiSystemId', 'salaryCurrencyCountryId', 'contractCompanyId', 'gosiCompanyId', 'healthInsuranceCompanyId'];
const CODED = ['gender', 'workMode'];
const TEXT = ['workLocation', 'personalEmail', 'workPhone', 'personalPhone', 'fullName', 'fullNameEn', 'idNumber', 'contractTypeOther', 'profession', 'iban', 'notes'];
const DATES = ['birthDate', 'idExpiryDate', 'startDate', 'endDate', 'gosiRegistrationDate'];
const NUMBERS = ['monthlyGrossSalary'];
const LOOKUP_CHUNK = 100;

const filled = (row: SheetRow, id: string): boolean => (row.cells[id] ?? '').trim() !== '';

/** The employees a file names, by number (at most 100 numbers per request); a number nobody holds is simply missing from the answer. */
export async function findByNumbers(numbers: string[]): Promise<Map<string, EmployeeListItemDto>> {
  const chunks = Array.from({ length: Math.ceil(numbers.length / LOOKUP_CHUNK) }, (_, i) => numbers.slice(i * LOOKUP_CHUNK, (i + 1) * LOOKUP_CHUNK));
  const pages = await Promise.all(chunks.map((chunk) => apiClient.get<Paginated<EmployeeListItemDto>>('/employees', { employeeNumbers: chunk.join(','), pageSize: LOOKUP_CHUNK })));
  return new Map(pages.flatMap((p) => p.items).map((e) => [e.employeeNumber, e]));
}

type Reader = (id: string) => string | number | boolean | null;

/** What the row's filled cells say, as the form's own strings; an empty cell says nothing (it changes nothing). */
function overlayOf(row: SheetRow, check: RowChecker, ctx: EmployeeImportContext, found: EmployeeListItemDto): Partial<FormState> {
  const overlay: Record<string, string | boolean> = {};
  const read = (ids: string[], reader: Reader) => {
    for (const id of ids.filter((i) => filled(row, i))) {
      const value = reader(id);
      if (value !== null) overlay[id] = typeof value === 'number' ? String(value) : value;
    }
  };
  const units = unitsOf(ctx.reference, found.company.id);
  read(['orgNodeId'], (id) => check.choice(id, units));
  const titles = units.find((u) => u.id === (overlay.orgNodeId ?? found.orgNode?.id))?.titles ?? [];
  read(['jobTitleId'], (id) => check.choice(id, titles));
  const choice: Reader = (id) => check.choice(id, ctx.lists[id] as Choice[]);
  read(CHOICE_FIELDS, choice);
  read(CODED, choice);
  read(TEXT, (id) => check.text(id));
  read(DATES, (id) => check.date(id));
  read(YES_NO, (id) => check.yesNo(id));
  read(NUMBERS, (id) => check.number(id));
  return overlay as Partial<FormState>;
}

/** Looks the manager up by number; a number nobody holds is a refusal of this row only. */
async function managerIdOf(managerNumber: string): Promise<string> {
  const found = await apiClient.get<{ id: string; employeeNumber: string }[]>('/employees/managers', { search: managerNumber });
  const id = found.find((m) => m.employeeNumber === managerNumber)?.id;
  if (!id) throw new ApiError(422, 'MANAGER_NOT_FOUND', 'Direct manager not found');
  return id;
}

/** Applies the overlay to the person's saved record and saves it as an edit: a changed unit, title or manager starts today and keeps its history (FR-89). */
async function updateEmployee(id: string, overlay: Partial<FormState>, managerNumber: string, today: string): Promise<void> {
  const existing = await apiClient.get<EmployeeDto>(`/employees/${id}`);
  const managerId = managerNumber ? { managerId: await managerIdOf(managerNumber) } : {};
  const form: FormState = { ...toFormState(existing), ...overlay, ...managerId, effectiveFrom: today, changeReason: IMPORT_REASON };
  await apiClient.put(`/employees/${id}`, toPayload(form, true));
}

/**
 * Update mode of the import (FR-95): each row names an employee by number and the cells it fills are what changes; an empty cell leaves the record as it is,
 * so what people changed on the platform is only overwritten by what the file says. A row that names nobody is refused with its reason.
 */
export async function prepareUpdateRows(rows: SheetRow[], ctx: EmployeeImportContext, today: string): Promise<PreparedRow[]> {
  const numbers = [...new Set(rows.map((r) => (r.cells.employeeNumber ?? '').trim()).filter(Boolean))];
  const people = await findByNumbers(numbers);
  const duplicates = flagDuplicates(rows.map((r) => ({ rowNumber: r.rowNumber, value: (r.cells.employeeNumber ?? '').trim() || null })), ctx.headers.employeeNumber as string, ctx.t);
  const rowOf = (row: SheetRow): PreparedRow => {
    const check = new RowChecker(ctx.t, row.cells, ctx.headers);
    const number = check.text('employeeNumber', true);
    const found = number ? people.get(number) : undefined;
    const errors = [...check.errors, ...[duplicates.get(row.rowNumber)].filter((e): e is string => !!e)];
    if (number && !found) errors.push(ctx.t('employees:import.notFound', { value: number }));
    if (!found) return { rowNumber: row.rowNumber, errors };
    const overlay = overlayOf(row, check, ctx, found);
    errors.push(...check.errors.filter((e) => !errors.includes(e)), ...overlayProblems(overlay, row, ctx.t));
    return { rowNumber: row.rowNumber, errors, run: errors.length ? undefined : () => updateEmployee(found.id, overlay, row.cells.managerNumber ?? '', today) };
  };
  return rows.map(rowOf);
}

/** A row must say something, and a new unit comes with its title (the title has to fit the unit). */
function overlayProblems(overlay: Partial<FormState>, row: SheetRow, t: EmployeeImportContext['t']): string[] {
  if (overlay.orgNodeId && !overlay.jobTitleId) return [t('employees:import.titleWithUnit')];
  return Object.keys(overlay).length || filled(row, 'managerNumber') ? [] : [t('employees:import.nothingToChange')];
}
