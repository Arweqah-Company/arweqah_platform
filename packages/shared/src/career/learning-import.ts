import { z } from 'zod';

/**
 * The learning-links sheet (FR-113): one row per learning unit of a title's plan, found by the title's code, the period's name and the unit's
 * name, with the address the employee opens. Importing it sets (or clears) those addresses without touching anything else of the path.
 */
export const learningImportRowSchema = z.strictObject({
  titleCode: z.string().trim().min(1).max(40),
  period: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(300),
  /** Empty clears the link; otherwise an https address. */
  link: z.union([z.literal(''), z.url({ protocol: /^https$/ }).max(500)]),
});
export type LearningImportRow = z.infer<typeof learningImportRowSchema>;

export const LEARNING_IMPORT_MAX_ROWS = 1000;

/** `POST /career/learning-links`: `dryRun` (the default) only reports what each row would do. */
export const importLearningLinksSchema = z.strictObject({
  rows: z.array(learningImportRowSchema).min(1).max(LEARNING_IMPORT_MAX_ROWS),
  dryRun: z.boolean().default(true),
});
export type ImportLearningLinksInput = z.infer<typeof importLearningLinksSchema>;

export const LEARNING_IMPORT_REASONS = ['title_not_found', 'no_content', 'period_not_found', 'unit_not_found', 'unit_ambiguous', 'duplicate_row', 'content_changed'] as const;
export type LearningImportReason = (typeof LEARNING_IMPORT_REASONS)[number];

export interface LearningImportRowResultDto {
  /** The row's place in the request (1 = the first). */
  row: number;
  status: 'updated' | 'unchanged' | 'rejected';
  reason: LearningImportReason | null;
}

export interface LearningImportResultDto {
  dryRun: boolean;
  updated: number;
  unchanged: number;
  rejected: number;
  rows: LearningImportRowResultDto[];
}
