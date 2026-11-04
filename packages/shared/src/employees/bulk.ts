import { z } from 'zod';

/** The most employees one bulk edit may name. */
export const BULK_UPDATE_MAX = 500;

const isoDate = z.iso.date();

/** The fields of a bulk edit that change on a date and keep their history (the unit, the job title, the manager). */
export const BULK_PLACEMENT_FIELDS = ['orgNodeId', 'jobTitleId', 'managerId'] as const;

/**
 * One change applied to many employees: any of the unit, job title, manager (from a date, with a reason), the work location, the work mode and the relation type.
 * With `dryRun` nothing is saved: the answer says who would change and who would be refused, and why.
 */
export const bulkUpdateSchema = z
  .strictObject({
    employeeIds: z.array(z.uuid()).min(1).max(BULK_UPDATE_MAX),
    orgNodeId: z.uuid().optional(),
    jobTitleId: z.uuid().optional(),
    managerId: z.uuid().nullable().optional(),
    workLocation: z.string().trim().min(1).max(255).nullable().optional(),
    workMode: z.union([z.literal(0), z.literal(1), z.literal(2)]).nullable().optional(),
    relationTypeId: z.uuid().optional(),
    validFrom: isoDate.optional(),
    reason: z.string().trim().min(1).max(500).optional(),
    dryRun: z.boolean().default(false),
  })
  .refine((v) => new Set(v.employeeIds).size === v.employeeIds.length, { message: 'An employee is named twice', path: ['employeeIds'] })
  .refine((v) => [v.orgNodeId, v.jobTitleId, v.managerId, v.workLocation, v.workMode, v.relationTypeId].some((x) => x !== undefined), { message: 'Choose at least one value to change' })
  .refine((v) => !BULK_PLACEMENT_FIELDS.some((f) => v[f] !== undefined) || (!!v.validFrom && !!v.reason), { message: 'A change of unit, job title or manager needs a start day and a reason', path: ['validFrom'] });
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;

export interface BulkPersonDto {
  id: string;
  fullName: string;
}

export interface BulkRefusalDto extends BulkPersonDto {
  /** The stable code of the rule that refused this employee (the web maps it to a sentence). */
  code: string;
  message: string;
}

export interface BulkUpdateResultDto {
  dryRun: boolean;
  accepted: BulkPersonDto[];
  rejected: BulkRefusalDto[];
}
