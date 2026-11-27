import type { EmployeeDto } from '@arweqah-platform/shared';

/** The five details of the «Basic data» card. */
export const BASIC_FIELDS = ['fullName', 'gender', 'nationalityId', 'birthDate', 'maritalStatusId'] as const;
export type BasicField = (typeof BASIC_FIELDS)[number];

/**
 * What the person may change of their own record, read from the same list the employees page and the API use: the fields their grants of
 * «edit employees» give them for their own record (FR-94). The profile asks nothing else, so the two pages never disagree (FR-222).
 */
export function ownEditable(employee: EmployeeDto) {
  const fields = new Set(employee.editableFields ?? []);
  const basic = BASIC_FIELDS.filter((f) => fields.has(f));
  return {
    has: (field: string) => fields.has(field),
    /** The basic details changed directly (on the employee's page); the others are asked for from HR. */
    basicDirect: basic,
    basicAsked: BASIC_FIELDS.filter((f) => !fields.has(f)),
  };
}
