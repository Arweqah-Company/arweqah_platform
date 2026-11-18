import { z } from 'zod';
import type { BilingualName } from './schemas';
import { MAX_EMPLOYEE_AGE, MIN_EMPLOYEE_AGE, todayIso, yearsBetween } from './validators';

/** The basic personal data an employee may ask to change (FR-162); HR approves. Everything else of the record stays HR's. */
export const BASIC_REQUEST_FIELDS = ['fullName', 'gender', 'nationalityId', 'birthDate', 'maritalStatusId'] as const;
export type BasicRequestField = (typeof BASIC_REQUEST_FIELDS)[number];

export const BASIC_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type BasicRequestStatus = (typeof BASIC_REQUEST_STATUSES)[number];

/** The values asked for: only the fields that change, none emptied. At least one is needed (the API also drops the ones equal to the record). */
export const basicRequestSchema = z
  .strictObject({
    fullName: z.string().trim().min(1).max(255).optional(),
    gender: z.union([z.literal(0), z.literal(1)]).optional(),
    nationalityId: z.uuid().optional(),
    birthDate: z.iso.date().optional(),
    maritalStatusId: z.uuid().optional(),
  })
  .superRefine((v, ctx) => {
    if (Object.values(v).every((x) => x === undefined)) ctx.addIssue({ code: 'custom', message: 'Choose at least one value to change' });
    if (!v.birthDate) return;
    if (v.birthDate >= todayIso()) ctx.addIssue({ code: 'custom', path: ['birthDate'], message: 'Must be in the past' });
    else if (yearsBetween(v.birthDate) < MIN_EMPLOYEE_AGE || yearsBetween(v.birthDate) > MAX_EMPLOYEE_AGE) {
      ctx.addIssue({ code: 'custom', path: ['birthDate'], message: `Age must be between ${MIN_EMPLOYEE_AGE} and ${MAX_EMPLOYEE_AGE}` });
    }
  });
export type BasicRequestInput = z.infer<typeof basicRequestSchema>;

/** HR's refusal: the reason is optional (it is sent to the employee when written). */
export const rejectBasicRequestSchema = z.strictObject({ reason: z.string().trim().max(500).optional() });
export type RejectBasicRequestInput = z.infer<typeof rejectBasicRequestSchema>;

export interface BasicRequestDto {
  id: string;
  employeeId: string;
  status: BasicRequestStatus;
  /** What was asked for (only the changed fields). */
  values: BasicRequestInput;
  /** The names of the nationality and the marital status asked for, to show them without a second call. */
  names: { nationality: BilingualName | null; maritalStatus: BilingualName | null };
  rejectionReason: string | null;
  submittedAt: string;
  decidedAt: string | null;
}
