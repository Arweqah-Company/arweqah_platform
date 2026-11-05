import { z } from 'zod';
import { localizedNameSchema } from '../common/localized';
import { paginationQuerySchema, type Paginated } from '../common/pagination';
import { localizedListSchema, type LocalizedList } from './unit-charter';
import { TITLE_GRADE_MAX, TITLE_GRADE_MIN, TITLE_TRACKS, type ManagementMode, type TitleTrack } from './unit-types';

/**
 * Job titles with their grade, track, code, reporting line and content (FR-104…FR-107, plan section 3).
 * The code is `<unit code>-L<grade><track>-<sequence>`, built once when the title is made and never changed.
 */
export const titleGradeSchema = z.number().int().min(TITLE_GRADE_MIN).max(TITLE_GRADE_MAX);
export const titleTrackSchema = z.enum(TITLE_TRACKS);

/** The duties, qualifications and indicators of a title: ordered lines in both languages. */
export const jobTitleContentSchema = z.strictObject({
  responsibilities: localizedListSchema,
  qualifications: localizedListSchema,
  kpis: localizedListSchema,
});
export type JobTitleContentInput = z.infer<typeof jobTitleContentSchema>;

export interface JobTitleContentDto extends JobTitleContentInput {
  /** Starts at 1 and grows with every edit of the content (the career profile reopens its acknowledgement at a new version). */
  contentVersion: number;
}

/** A new title: its grade and track are required (the code is built from them). */
export const newJobTitleSchema = z.strictObject({
  ...localizedNameSchema,
  /** The role whose permissions the title's role starts with (left out = the Employee role). */
  templateRoleId: z.uuid().optional(),
  grade: titleGradeSchema,
  track: titleTrackSchema,
  /** The title this one reports to; chains never loop. */
  reportsToTitleId: z.uuid().nullable().optional(),
  content: jobTitleContentSchema.optional(),
});
export type NewJobTitleInput = z.infer<typeof newJobTitleSchema>;

/** `POST /org/nodes/:id/job-titles`: one or more new titles in a unit. */
export const createJobTitlesSchema = z.strictObject({ jobTitles: z.array(newJobTitleSchema).min(1).max(50) });
export type CreateJobTitlesInput = z.infer<typeof createJobTitlesSchema>;

export const JOB_TITLE_VACANCY_FILTER = ['true', 'false'] as const;

/**
 * `GET /org/job-titles`: search by name or code, filters by the unit (`sectorId`, `departmentId`, `sectionId`, `orgNodeId`: a title in that
 * unit or below it), grade, track and vacancy (`vacant=true`: nobody holds it).
 */
export const jobTitlesQuerySchema = paginationQuerySchema.extend({
  orgNodeId: z.uuid().optional(),
  sectorId: z.uuid().optional(),
  departmentId: z.uuid().optional(),
  sectionId: z.uuid().optional(),
  grade: z.coerce.number().int().min(TITLE_GRADE_MIN).max(TITLE_GRADE_MAX).optional(),
  track: titleTrackSchema.optional(),
  vacant: z.stringbool().optional(),
});
export type JobTitlesQuery = z.infer<typeof jobTitlesQuerySchema>;

export interface JobTitleListItemDto {
  id: string;
  /** Null for a title made before codes existed, until HR gives it a grade and track. */
  code: string | null;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  orgNodeId: string;
  unitCode: string | null;
  unitNameAr: string;
  unitNameEn: string;
  unitPathAr: string;
  unitPathEn: string;
  grade: number | null;
  track: TitleTrack | null;
  reportsToTitleId: string | null;
  /** People holding the title: the viewer's company in the team view, every company in the full view. */
  occupants: number;
}

export type JobTitlesPageDto = Paginated<JobTitleListItemDto>;

export const DEVELOPMENT_STAGE_CODES = ['foundation', 'specialization', 'mastery', 'operational_leadership', 'institutional_leadership'] as const;
export type DevelopmentStageName = (typeof DEVELOPMENT_STAGE_CODES)[number];

export interface DevelopmentStageDto {
  code: DevelopmentStageName;
  hoursPerYear: number;
  budgetCap: number;
}

/** A stored rule: a grade (and a track, or any track when null) gives a stage; HR edits the table later. */
export interface DevelopmentStageRuleDto {
  grade: number;
  track: TitleTrack | null;
  stage: DevelopmentStageDto;
}

export const CARD_STAGE_REASONS = ['no_rule', 'no_grade'] as const;
export type CardStageReason = (typeof CARD_STAGE_REASONS)[number];

export interface TitleCodePartsDto {
  unitCode: string;
  grade: number;
  track: TitleTrack;
  sequence: number;
}

export interface TitleRefDto {
  id: string;
  code: string | null;
  nameAr: string;
  nameEn: string;
}

export interface TitleOccupantsDto {
  companyId: string;
  companyNameAr: string;
  companyNameEn: string;
  count: number;
}

export type ChainStepState = 'vacant' | 'found' | 'blocked';

/** One higher title in the chain from the title to its manager: skipped when vacant, the manager's when found, out of reach when blocked. */
export interface TitleChainStepDto extends TitleRefDto {
  state: ChainStepState;
  unitNameAr: string;
  unitNameEn: string;
  /** Holders counted (found steps). */
  count: number | null;
  /** The person who would be the manager (found steps). */
  managerEmployeeId: string | null;
  managerName: string | null;
}

export interface TitleChainDto {
  /** The company the chain was walked for. */
  companyId: string;
  managerTitleId: string | null;
  steps: TitleChainStepDto[];
}

export interface JobTitleCardDto {
  id: string;
  code: string | null;
  codeParts: TitleCodePartsDto | null;
  nameAr: string;
  nameEn: string;
  isActive: boolean;
  unit: { id: string; code: string | null; nameAr: string; nameEn: string; pathAr: string; pathEn: string; effectiveMode: ManagementMode };
  grade: number | null;
  track: TitleTrack | null;
  developmentStage: DevelopmentStageDto | null;
  /** Why there is no stage: no rule covers the grade and track, or the title has no grade and track yet. */
  developmentStageReason: CardStageReason | null;
  reportsTo: TitleRefDto | null;
  responsibilities: LocalizedList;
  qualifications: LocalizedList;
  kpis: LocalizedList;
  contentVersion: number;
  occupants: TitleOccupantsDto[];
  /** The manager chain for `?company=` (the viewer's own company when left out); null when no company applies. */
  chain: TitleChainDto | null;
}

/** `GET /org/job-titles/:id/card?company=<id>`; another company than the viewer's needs `org.view_full`. */
export const titleCardQuerySchema = z.strictObject({ company: z.uuid().optional() });
export type TitleCardQuery = z.infer<typeof titleCardQuerySchema>;

export const TITLE_IMPORT_MAX_ROWS = 1000;

/**
 * One row of the titles file. With a `code` the title is matched by it (updated when it exists, made with exactly that code when it does not);
 * without one the unit (`unitCode`), `grade` and `track` build the code.
 */
export const titleImportRowSchema = z.strictObject({
  code: z.string().trim().max(30).nullable().optional(),
  unitCode: z.string().trim().max(20).nullable().optional(),
  ...localizedNameSchema,
  grade: titleGradeSchema.nullable().optional(),
  track: titleTrackSchema.nullable().optional(),
  /** The code of the title this one reports to (in the file or already in the system). */
  reportsToCode: z.string().trim().max(30).nullable().optional(),
  content: jobTitleContentSchema.optional(),
});
export type TitleImportRow = z.infer<typeof titleImportRowSchema>;

/** `POST /org/job-titles/bulk`: `dryRun` reports what would happen and writes nothing. */
export const importJobTitlesSchema = z.strictObject({
  dryRun: z.boolean().default(false),
  /** The role the new titles' roles start from (left out = the Employee role). */
  templateRoleId: z.uuid().optional(),
  rows: z.array(titleImportRowSchema).min(1).max(TITLE_IMPORT_MAX_ROWS),
});
export type ImportJobTitlesInput = z.infer<typeof importJobTitlesSchema>;

export const TITLE_IMPORT_REASONS = [
  'bad_code',
  'unit_required',
  'unit_not_found',
  'unit_not_accepting',
  'unit_code_missing',
  'unit_mismatch',
  'grade_required',
  'track_required',
  'grade_track_mismatch',
  'grade_track_frozen',
  'duplicate_in_file',
  'sequence_taken',
  'reports_to_unknown',
  'reports_to_self',
  'reports_to_cycle',
] as const;
export type TitleImportReason = (typeof TITLE_IMPORT_REASONS)[number];

export type TitleImportStatus = 'created' | 'updated' | 'unchanged' | 'rejected';

export interface TitleImportRowResultDto {
  /** The position of the row in the file, starting at 1. */
  row: number;
  status: TitleImportStatus;
  code: string | null;
  reasons: TitleImportReason[];
}

export interface TitleImportResultDto {
  dryRun: boolean;
  created: number;
  updated: number;
  unchanged: number;
  rejected: number;
  rows: TitleImportRowResultDto[];
}
