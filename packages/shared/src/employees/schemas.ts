import { z } from 'zod';
import { roleExpiriesSchema } from '../exceptions/schemas';
import { paginationQuerySchema, type Paginated } from '../common/pagination';
import {
  MAX_EMPLOYEE_AGE,
  MIN_EMPLOYEE_AGE,
  addYears,
  isE164Phone,
  isEnglishName,
  isValidSaudiIban,
  isWorkEmail,
  normalizeIban,
  todayIso,
  yearsBetween,
} from './validators';

export const WORK_MODES = [0, 1, 2] as const; // 0 on-site, 1 hybrid, 2 remote
export const GENDERS = [0, 1] as const; // 0 male, 1 female

const isoDate = z.iso.date();
const optionalId = z.uuid().nullable().optional();
const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => text(max).nullable().optional();
const phone = z.string().trim().refine(isE164Phone, 'Use the international format, e.g. +966501234567').nullable().optional();

const employeeShape = {
  // Work
  companyId: z.uuid(),
  relationTypeId: optionalId,
  orgNodeId: z.uuid(),
  jobTitleId: z.uuid(),
  managerId: optionalId,
  workLocation: optionalText(255),
  workCountryId: optionalId,
  workMode: z.union([z.literal(0), z.literal(1), z.literal(2)]).nullable().optional(),
  // Contact
  workEmail: z
    .email()
    .max(255)
    .transform((e) => e.toLowerCase())
    .refine(isWorkEmail, 'Work email must end with @arweqah.sa'),
  personalEmail: z.email().max(255).nullable().optional(),
  workPhone: phone,
  personalPhone: phone,
  // Personal
  employeeNumber: text(50),
  fullName: text(255),
  fullNameEn: text(255).refine(isEnglishName, 'English letters and spaces only').nullable().optional(),
  gender: z.union([z.literal(0), z.literal(1)]).nullable().optional(),
  birthDate: isoDate.nullable().optional(),
  nationalityId: optionalId,
  maritalStatusId: optionalId,
  residencyStatusId: optionalId,
  idTypeId: optionalId,
  idNumber: text(50).nullable().optional(),
  idExpiryDate: isoDate.nullable().optional(),
  // Contract
  startDate: isoDate,
  endDate: isoDate.nullable().optional(),
  contractTypeId: optionalId,
  contractTypeOther: optionalText(255),
  contractCompanyId: optionalId,
  gosiCompanyId: optionalId,
  healthInsuranceCompanyId: optionalId,
  isGosiRegistered: z.boolean().default(false),
  gosiRegistrationDate: isoDate.nullable().optional(),
  gosiSystemId: optionalId,
  profession: optionalText(255),
  isQiwaContract: z.boolean().default(false),
  hasMedicalInsurance: z.boolean().default(false),
  terminationReasonId: optionalId,
  terminationReasonOther: optionalText(255),
  // Salary and cost
  monthlyGrossSalary: z.number().min(0).max(9_999_999_999.99).nullable().optional(),
  salaryCurrencyCountryId: optionalId,
  iban: z
    .string()
    .trim()
    .transform(normalizeIban)
    .refine(isValidSaudiIban, 'Enter a valid Saudi IBAN')
    .nullable()
    .optional(),
  // Log
  notes: optionalText(2000),
};

type Draft = Partial<{ [K in keyof typeof employeeShape]: unknown }>;
type Issue = (path: string, message: string) => void;

const text_ = (v: Draft, key: keyof Draft): string | null | undefined => v[key] as string | null | undefined;

/** Rules that depend only on the fields of the same request (flag-based rules live in the API service). */
function refineEmployee(v: Draft, ctx: z.RefinementCtx): void {
  const issue: Issue = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
  checkPairs(v, issue);
  checkBirthDate(v, issue);
  checkContractDates(v, issue);
  checkConditionalFields(v, issue);
}

function checkPairs(v: Draft, issue: Issue): void {
  if (text_(v, 'idTypeId') && !text_(v, 'idNumber')) issue('idNumber', 'Required when an ID type is selected');
  if (text_(v, 'idNumber') && !text_(v, 'idTypeId')) issue('idTypeId', 'Required when an ID number is entered');
  if (text_(v, 'personalEmail') && text_(v, 'personalEmail') === text_(v, 'workEmail')) issue('personalEmail', 'Must differ from the work email');
}

function checkBirthDate(v: Draft, issue: Issue): void {
  const birth = text_(v, 'birthDate');
  if (!birth) return;
  if (birth >= todayIso()) {
    issue('birthDate', 'Must be in the past');
    return;
  }
  const age = yearsBetween(birth);
  if (age < MIN_EMPLOYEE_AGE || age > MAX_EMPLOYEE_AGE) issue('birthDate', `Age must be between ${MIN_EMPLOYEE_AGE} and ${MAX_EMPLOYEE_AGE}`);
  const expiry = text_(v, 'idExpiryDate');
  if (expiry && expiry <= birth) issue('idExpiryDate', 'Must be after the birth date');
  const start = text_(v, 'startDate');
  if (start && start < addYears(birth, MIN_EMPLOYEE_AGE)) issue('startDate', `Employee must be at least ${MIN_EMPLOYEE_AGE} at the start date`);
}

function checkContractDates(v: Draft, issue: Issue): void {
  const start = text_(v, 'startDate');
  const end = text_(v, 'endDate');
  const gosiDate = text_(v, 'gosiRegistrationDate');
  if (start && end && end <= start) issue('endDate', 'Must be after the start date');
  if (start && gosiDate && gosiDate < start) issue('gosiRegistrationDate', 'Cannot be before the start date');
}

function checkConditionalFields(v: Draft, issue: Issue): void {
  if (v.isGosiRegistered) {
    if (!text_(v, 'gosiRegistrationDate')) issue('gosiRegistrationDate', 'Required when registered in GOSI');
    if (!text_(v, 'gosiSystemId')) issue('gosiSystemId', 'Required when registered in GOSI');
  }
  if (v.monthlyGrossSalary != null && !text_(v, 'salaryCurrencyCountryId')) issue('salaryCurrencyCountryId', 'Required when a salary is entered');
  if (text_(v, 'terminationReasonId') && !text_(v, 'endDate')) issue('endDate', 'Required when a termination reason is selected');
}

export const createEmployeeSchema = z
  .strictObject({ ...employeeShape, /** Left out = the default roles (Employee and the role of the job title); an empty list = none. */ roleIds: z.array(z.uuid()).max(20).optional(), roleExpiries: roleExpiriesSchema.optional() })
  .superRefine(refineEmployee);
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

/** The work email is the sign-in identity and cannot change here. */
const { workEmail, ...updatableShape } = employeeShape;
export const updateEmployeeSchema = z
  .strictObject({ ...updatableShape, workEmail: workEmail.optional() })
  .superRefine(refineEmployee);
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const assignEmployeeRolesSchema = z.strictObject({ roleIds: z.array(z.uuid()).max(20), roleExpiries: roleExpiriesSchema.optional() });
export type AssignEmployeeRolesInput = z.infer<typeof assignEmployeeRolesSchema>;

export const terminateEmployeeSchema = z
  .strictObject({
    endDate: isoDate,
    terminationReasonId: z.uuid(),
    terminationReasonOther: optionalText(255),
  });
export type TerminateEmployeeInput = z.infer<typeof terminateEmployeeSchema>;

/**
 * What a person may change about themselves: the interface language and theme, and three contact details. Everything
 * else (name, number, placement, contract, salary, documents) belongs to HR. Every field is optional; only those sent change.
 */
export const ownProfileSchema = z
  .strictObject({
    locale: z.enum(['ar', 'en']),
    theme: z.enum(['light', 'dark', 'system']),
    personalPhone: employeeShape.personalPhone,
    personalEmail: employeeShape.personalEmail,
    fullNameEn: employeeShape.fullNameEn,
  })
  .partial();
export type OwnProfileInput = z.infer<typeof ownProfileSchema>;

export const EMPLOYEE_STATUSES = ['active', 'inactive', 'needs-placement'] as const;
export const employeesQuerySchema = paginationQuerySchema.extend({
  companyId: z.uuid().optional(),
  orgNodeId: z.uuid().optional(),
  relationTypeId: z.uuid().optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  jobTitleId: z.uuid().optional(),
  contractTypeId: z.uuid().optional(),
  nationalityId: z.uuid().optional(),
  maritalStatusId: z.uuid().optional(),
  residencyStatusId: z.uuid().optional(),
  gender: z.coerce.number().int().min(0).max(1).optional(),
  workMode: z.coerce.number().int().min(0).max(2).optional(),
  /** Contract start date range (inclusive, ISO dates). */
  startFrom: z.iso.date().optional(),
  startTo: z.iso.date().optional(),
  /** Documents or contracts that need attention within 30 days (an expired ID counts). */
  idExpiring: z.stringbool().optional(),
  contractEnding: z.stringbool().optional(),
});
export type EmployeesQuery = z.infer<typeof employeesQuerySchema>;

export const managerSearchSchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
  excludeId: z.uuid().optional(),
});
export type ManagerSearchQuery = z.infer<typeof managerSearchSchema>;

interface NamedRef {
  id: string;
  nameAr: string;
  nameEn: string;
}

/** Sensitive values are null (and `sensitiveHidden` true) unless the viewer holds employees.view_sensitive. */
export interface EmployeeDto {
  id: string;
  userId: string;
  isActive: boolean;
  isSystemAccount: boolean;
  authenticatorEnabled: boolean;
  company: NamedRef;
  relationTypeId: string | null;
  orgNode: (NamedRef & { pathAr: string; pathEn: string }) | null;
  jobTitle: NamedRef | null;
  manager: { id: string; fullName: string } | null;
  workLocation: string | null;
  workCountryId: string | null;
  workMode: 0 | 1 | 2 | null;
  workEmail: string;
  personalEmail: string | null;
  workPhone: string | null;
  personalPhone: string | null;
  employeeNumber: string;
  fullName: string;
  fullNameEn: string | null;
  gender: 0 | 1 | null;
  birthDate: string | null;
  nationalityId: string | null;
  maritalStatusId: string | null;
  residencyStatusId: string | null;
  idTypeId: string | null;
  idNumber: string | null;
  idExpiryDate: string | null;
  startDate: string;
  endDate: string | null;
  contractTypeId: string | null;
  contractTypeOther: string | null;
  contractCompanyId: string | null;
  gosiCompanyId: string | null;
  healthInsuranceCompanyId: string | null;
  isGosiRegistered: boolean;
  gosiRegistrationDate: string | null;
  gosiSystemId: string | null;
  profession: string | null;
  isQiwaContract: boolean;
  hasMedicalInsurance: boolean;
  terminationReasonId: string | null;
  terminationReasonOther: string | null;
  monthlyGrossSalary: number | null;
  salaryCurrencyCountryId: string | null;
  iban: string | null;
  notes: string | null;
  roles: (NamedRef & { expiresAt: string | null })[];
  /** Groups of roles the person was given (their roles come on top of the ones above). */
  groups: NamedRef[];
  sensitiveHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListItemDto {
  id: string;
  employeeNumber: string;
  fullName: string;
  workEmail: string;
  company: NamedRef;
  orgNode: (NamedRef & { pathAr: string; pathEn: string }) | null;
  jobTitle: NamedRef | null;
  isActive: boolean;
  needsPlacement: boolean;
  idExpiresSoon: boolean;
  contractEndsSoon: boolean;
}

export type EmployeesPage = Paginated<EmployeeListItemDto>;

/** The signed-in person's own page: their preferences and, when they have one, their employee record (sensitive fields always hidden). */
export interface OwnProfileDto {
  preferences: { locale: 'ar' | 'en'; theme: 'light' | 'dark' | 'system' };
  employee: EmployeeDto | null;
}

/** Counts for the home dashboard, limited to the employees the viewer may see. */
export interface EmployeesSummaryDto {
  total: number;
  active: number;
  inactive: number;
  needsPlacement: number;
  /** Identity documents already expired or expiring within 30 days. */
  idExpiring: number;
  /** Contracts ending within the next 30 days. */
  contractEnding: number;
}

export interface InviteResultDto {
  /** False when the e-mail could not be delivered; the invitation can be re-sent. */
  sent: boolean;
  sentTo: string;
  /** Present only outside production so an invitation can be tried without e-mail. */
  enrollmentUrl?: string;
}

export interface CreateEmployeeResultDto {
  employee: EmployeeDto;
  invitation: InviteResultDto;
}
