import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination';
import type { BilingualName } from './schemas';

/** The three placement values of an employee that change on a date and keep their history (FR-89). */
export const ASSIGNMENT_FIELDS = ['org_node', 'job_title', 'manager'] as const;
export type AssignmentField = (typeof ASSIGNMENT_FIELDS)[number];

/** Who set a manager period: HR (`manual`, stays until HR changes it) or the system from the reporting line of job titles (`auto_chain`, follows people as they come and go; FR-100). */
export const MANAGER_SOURCES = ['auto_chain', 'manual'] as const;
export type ManagerSource = (typeof MANAGER_SOURCES)[number];

const isoDate = z.iso.date();

/**
 * One change of placement: any of the unit, the job title and the direct manager, from one date, with the reason.
 * `managerId: null` removes the manager. The unit and the title are never emptied.
 */
export const changeAssignmentsSchema = z
  .strictObject({
    orgNodeId: z.uuid().optional(),
    jobTitleId: z.uuid().optional(),
    managerId: z.uuid().nullable().optional(),
    validFrom: isoDate,
    reason: z.string().trim().min(1).max(500),
  })
  .refine((v) => v.orgNodeId !== undefined || v.jobTitleId !== undefined || v.managerId !== undefined, { message: 'Choose at least one value to change' });
export type ChangeAssignmentsInput = z.infer<typeof changeAssignmentsSchema>;

export const ASSIGNMENT_STATUSES = ['past', 'current', 'pending'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface EmployeeAssignmentDto {
  id: string;
  field: AssignmentField;
  /** The unit, job title or manager (employee) id; null for "no manager". */
  valueId: string | null;
  /** The name of that value in both languages (the unit's path, the title, the manager); null for "no manager". */
  value: BilingualName | null;
  validFrom: string;
  validTo: string | null;
  reason: string;
  createdBy: string | null;
  createdByName: string | null;
  status: AssignmentStatus;
  /** Manager periods only: who set it. Always sent by the API. */
  managerSource?: ManagerSource | null;
}

export interface EmployeeAssignmentsDto {
  items: EmployeeAssignmentDto[];
}

/** The route parameters of an employee's one period. */
export const assignmentParamsSchema = z.strictObject({ id: z.uuid(), assignmentId: z.uuid() });

/** One entry of an employee's change log: what was done, by whom and when (field names only, never values). */
export interface EmployeeChangeDto {
  id: string;
  action: string;
  actorName: string | null;
  fields: string[];
  createdAt: string;
}

export const employeeChangesQuerySchema = paginationQuerySchema;
