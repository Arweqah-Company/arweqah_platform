import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { titleGradeSchema, titleTrackSchema } from './job-titles';
import type { TitleTrack } from './unit-types';

export const MAX_ORG_LEVELS = 20;

/** The day a unit started working: not before the group's earliest records, and at most two years ahead (a planned unit). */
export const UNIT_START_EARLIEST = '1980-01-01';
export const UNIT_START_YEARS_AHEAD = 2;
export const unitStartDateIsValid = (isoDate: string, today: Date = new Date()): boolean => {
  const latest = new Date(today);
  latest.setUTCFullYear(latest.getUTCFullYear() + UNIT_START_YEARS_AHEAD);
  return isoDate >= UNIT_START_EARLIEST && isoDate <= latest.toISOString().slice(0, 10);
};
export const unitStartDateSchema = z.iso.date().refine((d) => unitStartDateIsValid(d), 'Start date is out of range');

/** A grade and a track come together (the title code is built from both); a title made before codes existed has neither. */
const gradeAndTrackTogether = (v: { grade?: number | null | undefined; track?: string | null | undefined }): boolean => (v.grade == null) === (v.track == null);
const GRADE_AND_TRACK_MESSAGE = { path: ['grade'], message: 'Give the grade and the track together' };

/**
 * A title made together with its unit. `templateRoleId`: the role whose permissions the role of the new job title starts with (left out = the Employee role).
 * `grade` and `track` (both or none) give the title its code; adding a title to a unit later (`POST /org/nodes/:id/job-titles`) requires them (see `createJobTitlesSchema`).
 */
export const jobTitleInputSchema = z
  .strictObject({ ...localizedNameSchema, templateRoleId: z.uuid().optional(), grade: titleGradeSchema.optional(), track: titleTrackSchema.optional() })
  .refine(gradeAndTrackTogether, GRADE_AND_TRACK_MESSAGE);
export type JobTitleInput = z.infer<typeof jobTitleInputSchema>;

export const moveOrgNodeSchema = z.strictObject({ parentId: z.uuid().nullable() });
export type MoveOrgNodeInput = z.infer<typeof moveOrgNodeSchema>;

export const addJobTitlesSchema = z.strictObject({
  jobTitles: z.array(jobTitleInputSchema).min(1).max(50),
});
export type AddJobTitlesInput = z.infer<typeof addJobTitlesSchema>;

/**
 * `grade` and `track` can be given only to a title that has none (the code is built from them and then frozen);
 * `reportsToTitleId` null clears the reporting line, left out keeps it.
 */
export const updateJobTitleSchema = z
  .strictObject({
    ...localizedNameSchema,
    isActive: z.boolean().default(true),
    grade: titleGradeSchema.optional(),
    track: titleTrackSchema.optional(),
    reportsToTitleId: z.uuid().nullable().optional(),
  })
  .refine(gradeAndTrackTogether, GRADE_AND_TRACK_MESSAGE);
export type UpdateJobTitleInput = z.infer<typeof updateJobTitleSchema>;

export interface JobTitleDto {
  id: string;
  orgNodeId: string;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  employeesCount: number;
  /** Null for a title made before codes existed, until it gets a grade and track (and its unit has a code). */
  code: string | null;
  grade: number | null;
  track: TitleTrack | null;
  reportsToTitleId: string | null;
  /** Grows with every edit of the duties, qualifications and indicators. */
  contentVersion: number;
}
