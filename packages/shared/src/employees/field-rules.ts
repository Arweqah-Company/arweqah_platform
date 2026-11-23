export const EMPLOYEE_FIELD_GROUPS = ['personal', 'contact', 'work', 'identity', 'contract', 'salary', 'notes', 'structure'] as const;
export type EmployeeFieldGroup = (typeof EMPLOYEE_FIELD_GROUPS)[number];

interface FieldDef {
  key: string;
  group: EmployeeFieldGroup;
}

/**
 * The details of an employee whose editor is chosen on the permission «edit employees» (FR-94): every grant of it (a role, a group of roles,
 * a group of people or one person) carries the list of fields its holder may change. The work e-mail is not listed: it is the sign-in identity
 * and is never changed from the form. The unit, job title and manager need the key «change placement from a date» as well as being listed.
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
  { key: 'fullName', group: 'identity' },
  { key: 'idTypeId', group: 'identity' },
  { key: 'idNumber', group: 'identity' },
  { key: 'idExpiryDate', group: 'identity' },
  { key: 'contractTypeId', group: 'contract' },
  { key: 'contractTypeOther', group: 'contract' },
  { key: 'contractCompanyId', group: 'contract' },
  { key: 'isGosiRegistered', group: 'contract' },
  { key: 'gosiCompanyId', group: 'contract' },
  { key: 'gosiRegistrationDate', group: 'contract' },
  { key: 'gosiSystemId', group: 'contract' },
  { key: 'isQiwaContract', group: 'contract' },
  { key: 'hasMedicalInsurance', group: 'contract' },
  { key: 'healthInsuranceCompanyId', group: 'contract' },
  { key: 'monthlyGrossSalary', group: 'salary' },
  { key: 'salaryCurrencyCountryId', group: 'salary' },
  { key: 'iban', group: 'salary' },
  { key: 'notes', group: 'notes' },
  { key: 'companyId', group: 'structure' },
  { key: 'orgNodeId', group: 'structure' },
  { key: 'jobTitleId', group: 'structure' },
  { key: 'managerId', group: 'structure' },
  { key: 'relationTypeId', group: 'structure' },
  { key: 'startDate', group: 'structure' },
  { key: 'endDate', group: 'structure' },
  { key: 'terminationReasonId', group: 'structure' },
  { key: 'terminationReasonOther', group: 'structure' },
  { key: 'employeeNumber', group: 'structure' },
];

export const EMPLOYEE_FIELD_KEYS: string[] = EMPLOYEE_FIELDS.map((f) => f.key);

/** What a new grant of «edit employees» starts with: the personal and contact details («basic data»). The administrator changes it freely. */
export const DEFAULT_EDITABLE_FIELDS: readonly string[] = EMPLOYEE_FIELDS.filter((f) => f.group === 'personal' || f.group === 'contact').map((f) => f.key);

/** What a plain employee could change of their own record before the fields became part of each grant: the grants the platform already had keep it. */
export const LEGACY_SELF_EDITABLE_FIELDS: string[] = ['workPhone', 'personalPhone', 'personalEmail', 'fullNameEn'];

/** Every field: what the platform administrator's grant holds. */
export const ALL_EDITABLE_FIELDS: readonly string[] = EMPLOYEE_FIELD_KEYS;

/**
 * Permissions whose grants carry a list of fields: «edit employees» (the details its holder may change) and «open an employee» (the details
 * its holder sees on the employee's page).
 */
export const FIELD_SCOPED_PERMISSIONS: readonly string[] = ['employees.update', 'employees.open'];
export const carriesFields = (permissionKey: string): boolean => FIELD_SCOPED_PERMISSIONS.includes(permissionKey);

/** The three details every opened page shows whatever the list: the name and number in the header and the company. They are not offered in the choice. */
export const ALWAYS_VISIBLE_FIELDS: readonly string[] = ['fullName', 'employeeNumber', 'companyId'];

/** A detail only the page shows, never edited with the form: the roles of the person. */
export const ROLES_FIELD = 'roles';

/** The fields offered by «open an employee»: every one but those of the page header, and the roles. */
export const VISIBLE_FIELD_CHOICES: readonly FieldDef[] = [...EMPLOYEE_FIELDS.filter((f) => !ALWAYS_VISIBLE_FIELDS.includes(f.key)), { key: ROLES_FIELD, group: 'structure' }];

/** Every detail the page can show: what a new grant of «open an employee» starts with. */
export const ALL_VISIBLE_FIELDS: readonly string[] = [...ALL_EDITABLE_FIELDS, ROLES_FIELD];

/** What a new grant starts with: «edit» starts with the basic data, «open» with everything (a page that hides something by accident reads as a bug). */
export const defaultFieldsFor = (permissionKey: string): readonly string[] => (permissionKey === 'employees.open' ? ALL_VISIBLE_FIELDS : DEFAULT_EDITABLE_FIELDS);

/** The fields a grant gives: its own list, or the permission's default when the grant has none (a new grant, or one saved by a caller that does not know the lists). */
export const fieldsOfGrant = (grant: { key: string; fields?: readonly string[] | null }): readonly string[] =>
  carriesFields(grant.key) ? (grant.fields ?? defaultFieldsFor(grant.key)) : [];

/** What a grant stores in its `fields` column: the list for a permission that carries one (the basic data when the grant gave none), nothing for the others. */
export const storedFields = (grant: { key: string; fields?: readonly string[] | null }): string[] | null => (carriesFields(grant.key) ? [...fieldsOfGrant(grant)] : null);

/** An employee whose page shows fewer details than this, with no photo button and no history tab, opens in a pop-up (like «My team») instead of a page. */
export const POPUP_MAX_FIELDS = 10;
