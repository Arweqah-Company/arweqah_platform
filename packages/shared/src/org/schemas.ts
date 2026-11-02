import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';

export const MAX_ORG_LEVELS = 12;

/** The day a unit started working: not before the group's earliest records, and at most two years ahead (a planned unit). */
export const UNIT_START_EARLIEST = '1980-01-01';
export const UNIT_START_YEARS_AHEAD = 2;

export const unitStartDateIsValid = (isoDate: string, today: Date = new Date()): boolean => {
  const latest = new Date(today);
  latest.setUTCFullYear(latest.getUTCFullYear() + UNIT_START_YEARS_AHEAD);
  return isoDate >= UNIT_START_EARLIEST && isoDate <= latest.toISOString().slice(0, 10);
};

const unitStartDateSchema = z.iso.date().refine((d) => unitStartDateIsValid(d), 'Start date is out of range');

/** One division of a company's structure (sector, department, section, unit…). */
export const orgLevelInputSchema = z.strictObject({
  /** Present when editing an existing level, absent for a new one. */
  id: z.uuid().optional(),
  ...localizedNameSchema,
  /** Job titles and employees attach only to assignable levels. */
  isAssignable: z.boolean(),
});
export type OrgLevelInput = z.infer<typeof orgLevelInputSchema>;

/** What happens to employees of units that are about to be removed. */
export const employeesDecisionSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('transfer'),
    unitId: z.uuid(),
    /** Old job title id → job title id of the target unit. */
    titleMap: z.record(z.uuid(), z.uuid()),
  }),
  z.strictObject({ action: z.literal('delete'), confirmCount: z.number().int().min(1) }),
]);
export type EmployeesDecision = z.infer<typeof employeesDecisionSchema>;

export const saveOrgLevelsSchema = z
  .strictObject({
    companyId: z.uuid(),
    levels: z.array(orgLevelInputSchema).min(1).max(MAX_ORG_LEVELS),
    /** Required when the change affects existing data (see OrgImpactDto). */
    confirm: z
      .strictObject({ impactToken: z.string().min(16).max(200), employees: employeesDecisionSchema.optional() })
      .optional(),
  })
  .refine((v) => v.levels.at(-1)?.isAssignable === true, {
    path: ['levels'],
    message: 'The last level must accept job titles and employees',
  });
export type SaveOrgLevelsInput = z.infer<typeof saveOrgLevelsSchema>;

export const previewOrgLevelsSchema = z.strictObject({
  companyId: z.uuid(),
  levels: z.array(orgLevelInputSchema).min(1).max(MAX_ORG_LEVELS),
});
export type PreviewOrgLevelsInput = z.infer<typeof previewOrgLevelsSchema>;

export const copyOrgLevelsSchema = z.strictObject({ fromCompanyId: z.uuid(), toCompanyId: z.uuid() });
export type CopyOrgLevelsInput = z.infer<typeof copyOrgLevelsSchema>;

/** `templateRoleId`: the role whose permissions the role of the new job title starts with (left out = the Employee role). */
export const jobTitleInputSchema = z.strictObject({ ...localizedNameSchema, templateRoleId: z.uuid().optional() });
export type JobTitleInput = z.infer<typeof jobTitleInputSchema>;

export const createOrgNodeSchema = z.strictObject({
  levelId: z.uuid(),
  /** Null only for units of the first level. */
  parentId: z.uuid().nullable(),
  ...localizedNameSchema,
  managerId: z.uuid().nullable().optional(),
  /** The day the unit starts working. */
  startDate: unitStartDateSchema,
  /** At least one title is required when the level accepts titles; none otherwise. */
  jobTitles: z.array(jobTitleInputSchema).max(50).default([]),
});
export type CreateOrgNodeInput = z.infer<typeof createOrgNodeSchema>;

export const updateOrgNodeSchema = z.strictObject({
  ...localizedNameSchema,
  managerId: z.uuid().nullable().optional(),
  startDate: unitStartDateSchema,
  isActive: z.boolean().default(true),
});
export type UpdateOrgNodeInput = z.infer<typeof updateOrgNodeSchema>;

export const moveOrgNodeSchema = z.strictObject({ parentId: z.uuid().nullable() });
export type MoveOrgNodeInput = z.infer<typeof moveOrgNodeSchema>;

export const addJobTitlesSchema = z.strictObject({
  jobTitles: z.array(jobTitleInputSchema).min(1).max(50),
});
export type AddJobTitlesInput = z.infer<typeof addJobTitlesSchema>;

export const updateJobTitleSchema = z.strictObject({ ...localizedNameSchema, isActive: z.boolean().default(true) });
export type UpdateJobTitleInput = z.infer<typeof updateJobTitleSchema>;

export interface OrgLevelDto {
  id: string;
  companyId: string;
  sortOrder: number;
  nameAr: string;
  nameEn: string;
  isAssignable: boolean;
  /** Which default level this one came from (`sector`, `department`, `section`, `unit`); null for levels a company added itself. */
  templateCode: string | null;
  unitsCount: number;
}

export interface JobTitleDto {
  id: string;
  orgNodeId: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  employeesCount: number;
}

export interface OrgNodeDto {
  id: string;
  companyId: string;
  levelId: string;
  parentId: string | null;
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
}

export interface OrgTreeDto {
  companyId: string;
  levels: OrgLevelDto[];
  nodes: OrgNodeDto[];
}

/** Data a level change would remove or detach; shown to the user before they confirm. */
export interface OrgImpactDto {
  unitsCount: number;
  jobTitlesCount: number;
  employeesCount: number;
  /** Job titles that currently have employees, so they can be mapped when transferring. */
  titlesWithEmployees: { id: string; nameAr: string; nameEn: string; employeesCount: number }[];
  /** Units that will be removed (up to 50, for display). */
  units: { id: string; pathAr: string; pathEn: string }[];
  /** Opaque value bound to this exact impact; sent back on confirmation. */
  impactToken: string;
}

export interface OrgLevelsPreviewDto {
  requiresConfirmation: boolean;
  impact: OrgImpactDto | null;
}
