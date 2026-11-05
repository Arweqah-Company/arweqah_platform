import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { MANAGEMENT_MODES, type ManagementMode } from './unit-types';
import { changeReasonSchema } from './unit-charter';
import { jobTitleInputSchema, unitStartDateSchema, type JobTitleDto } from './schemas';

export const managementModeSchema = z.enum(MANAGEMENT_MODES);

/** Three capital letters that start the code of a sector, or of a department / office placed directly under the group. */
export const unitCodePrefixSchema = z.string().regex(/^[A-Z]{3}$/, 'Use three capital letters');
/** A whole unit code: `OPS.03.03.01`. */
export const unitCodeSchema = z.string().regex(/^[A-Z]{3}\.\d{2}\.\d{2}\.\d{2}$/, 'Use the form OPS.03.03.01');

export const createOrgNodeSchema = z.strictObject({
  /** The type of the unit (`OrgLevelDto.id`). */
  levelId: z.uuid(),
  /** Null for a unit placed directly under the group (a sector, or what the rules table allows at the root). */
  parentId: z.uuid().nullable(),
  ...localizedNameSchema,
  managerId: z.uuid().nullable().optional(),
  /** The day the unit starts working. */
  startDate: unitStartDateSchema,
  /** Titles are allowed only on a type that accepts them; none is required. */
  jobTitles: z.array(jobTitleInputSchema).max(50).default([]),
  /** Required for a sector and for a unit placed directly under the group (they start the code). */
  codePrefix: unitCodePrefixSchema.optional(),
  /** Required for a sector and for a unit placed directly under the group; elsewhere null / left out means «inherit from the parent». */
  managementMode: managementModeSchema.nullable().optional(),
});
export type CreateOrgNodeInput = z.infer<typeof createOrgNodeSchema>;

/**
 * The name and the on/off switch are dated (FR-99): `effectiveFrom` (today when left out, never in the past) says from when they hold;
 * a later day makes a scheduled version the nightly job applies, which is also how a unit is switched off by date instead of being deleted.
 * `reason` is required with `effectiveFrom`; the manager and the start day apply at once.
 */
export const updateOrgNodeSchema = z
  .strictObject({
    ...localizedNameSchema,
    managerId: z.uuid().nullable().optional(),
    startDate: unitStartDateSchema,
    isActive: z.boolean().default(true),
    effectiveFrom: z.iso.date().optional(),
    reason: changeReasonSchema.optional(),
  })
  .refine((v) => !v.effectiveFrom || !!v.reason, { path: ['reason'], message: 'Give the reason of a dated change' });
export type UpdateOrgNodeInput = z.infer<typeof updateOrgNodeSchema>;

/** Sets the code of a unit that has none yet (every unit that existed before the group structure); allowed once. */
export const setOrgNodeCodeSchema = z.strictObject({ code: unitCodeSchema });
export type SetOrgNodeCodeInput = z.infer<typeof setOrgNodeCodeSchema>;

/** `mode` null = inherit from the parent (not allowed for a sector or a unit directly under the group). `reason` goes to the audit log. */
export const changeManagementModeSchema = z.strictObject({
  mode: managementModeSchema.nullable(),
  reason: z.string().trim().min(3).max(500),
});
export type ChangeManagementModeInput = z.infer<typeof changeManagementModeSchema>;

export interface OrgNodeDto {
  id: string;
  /** The group company that holds the unit (every unit belongs to it). */
  companyId: string;
  levelId: string;
  levelKey: string;
  parentId: string | null;
  /** The unit code (`OPS.03.03.01`); null for a unit created before codes existed, until someone sets it. */
  code: string | null;
  nameAr: string;
  nameEn: string;
  pathAr: string;
  pathEn: string;
  managerId: string | null;
  managerName: string | null;
  /** ISO date the unit started working. */
  startDate: string;
  isActive: boolean;
  employeesCount: number;
  jobTitles: JobTitleDto[];
  /** What was set on this unit (null = inherits). */
  managementMode: ManagementMode | null;
  /** What applies to it: the closest explicit value going up (per company when none is set anywhere above). */
  effectiveMode: ManagementMode;
}

/** What changing the mode would do, counted before and returned after: employees of other companies whose manager changes. */
export interface ManagementModeImpactDto {
  /** Units whose effective mode changes (the unit and what inherits from it). */
  unitsAffected: number;
  /** Employees of companies other than the group company in those units: their manager is recomputed. */
  employeesOfOtherCompanies: number;
}

export interface ChangeManagementModeResultDto {
  node: OrgNodeDto;
  impact: ManagementModeImpactDto;
}
