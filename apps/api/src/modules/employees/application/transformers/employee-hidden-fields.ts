import { EMPLOYEE_FIELD_KEYS, ROLES_FIELD, type EmployeeDto, type EmployeeNamesDto } from '@arweqah-platform/shared';

/** The object that carries the name or the look-up of an id field, so hiding the id hides it too. */
const COMPANION: Record<string, keyof EmployeeDto> = { orgNodeId: 'orgNode', jobTitleId: 'jobTitle', managerId: 'manager' };
const NAME_OF: Record<string, keyof EmployeeNamesDto> = {
  relationTypeId: 'relationType',
  workCountryId: 'workCountry',
  nationalityId: 'nationality',
  maritalStatusId: 'maritalStatus',
  residencyStatusId: 'residencyStatus',
  idTypeId: 'idType',
  contractTypeId: 'contractType',
  contractCompanyId: 'contractCompany',
  gosiCompanyId: 'gosiCompany',
  healthInsuranceCompanyId: 'healthInsuranceCompany',
  gosiSystemId: 'gosiSystem',
  terminationReasonId: 'terminationReason',
  salaryCurrencyCountryId: 'salaryCurrency',
};

/**
 * The employee as the caller may see it: every detail the page was not opened with (`visibleFields`) is emptied before it leaves the API, with the name
 * it carries (a unit, a look-up). `null` = everything. The company, the name and the number of the page header are never hidden.
 */
export function hideFields(dto: EmployeeDto): EmployeeDto {
  if (!dto.visibleFields) return dto;
  const shown = new Set(dto.visibleFields);
  const out: Record<string, unknown> = { ...dto };
  const names: Record<string, unknown> = { ...dto.names };
  for (const key of EMPLOYEE_FIELD_KEYS) {
    if (shown.has(key)) continue;
    if (key in out) out[key] = typeof out[key] === 'boolean' ? false : null;
    if (COMPANION[key]) out[COMPANION[key]] = null;
    if (NAME_OF[key]) names[NAME_OF[key]] = null;
  }
  if (!shown.has(ROLES_FIELD)) Object.assign(out, { roles: [], groups: [] });
  return { ...(out as unknown as EmployeeDto), names: names as unknown as EmployeeNamesDto };
}
