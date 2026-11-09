import { z } from 'zod';
import { careerContentSchema, type CareerContent } from './content';

/**
 * The title file (FR-113; plan `docs/plans/phase-6-career-path-performance.md` §2.7): one text per job title with the job description, the
 * development, the learning plan and the required actions. The server reads it into the career content; `dryRun` only reports what it found.
 * The text can be pasted or read from a `.txt`, `.docx` or `.pdf` file by the web. When the fixed reader finds a part wrong, HR can ask the AI to place
 * what the file says (§2.9, FR-127): `POST …/file/ai` answers like a dry run and saves nothing; `POST …/file/confirm` saves the reviewed content.
 */
export const TITLE_FILE_MAX_CHARS = 200_000;

export const extractTitleFileSchema = z.strictObject({
  text: z.string().min(1).max(TITLE_FILE_MAX_CHARS),
  /** True (the default): report what was found and save nothing. */
  dryRun: z.boolean().default(true),
});
export type ExtractTitleFileInput = z.infer<typeof extractTitleFileSchema>;

/** Why a title file cannot be saved as it is: each code is one thing HR has to fix in the file. */
export const TITLE_FILE_PROBLEMS = [
  'summary_missing',
  'indicators_missing',
  'responsibilities_missing',
  'current_title_unmarked',
  'path_steps_missing',
  'transition_rule_missing',
  'competencies_missing',
  'learning_missing',
  'learning_total_mismatch',
  'badges_missing',
  'required_missing',
  'acknowledgement_missing',
  'code_mismatch',
  'content_invalid',
] as const;
export type TitleFileProblem = (typeof TITLE_FILE_PROBLEMS)[number];

export interface TitleFileCountsDto {
  indicators: number;
  responsibilities: number;
  tasks: number;
  ladderLevels: number;
  pathSteps: number;
  competencies: number;
  badges: number;
  learningPeriods: number;
  learningUnits: number;
  learningMinutes: number;
  requiredItems: number;
}

/** `rules`: read by the fixed reader; `ai`: placed by the AI service and waiting for a person to confirm. */
export type TitleFileSource = 'rules' | 'ai';

/** `POST /career/titles/:id/file/ai`: the same text a dry run takes; nothing is saved by this route. */
export const analyzeTitleFileSchema = z.strictObject({ text: z.string().min(1).max(TITLE_FILE_MAX_CHARS) });
export type AnalyzeTitleFileInput = z.infer<typeof analyzeTitleFileSchema>;

/** `POST /career/titles/:id/file/confirm`: the content a person reviewed, and the version of the content the AI read (a save in between is a 409 instead of being overwritten). */
export const confirmTitleFileSchema = z.strictObject({ content: careerContentSchema, expectedVersion: z.number().int().min(0) });
export type ConfirmTitleFileInput = z.infer<typeof confirmTitleFileSchema>;

export interface TitleFileResultDto {
  dryRun: boolean;
  /** True when the career content was replaced by what the file says (never on a dry run, never with a problem). */
  saved: boolean;
  /** The content version after the save; null when nothing was saved. */
  version: number | null;
  counts: TitleFileCountsDto;
  problems: TitleFileProblem[];
  /** The code of the title written in the «required» section of the file, when there is one. */
  codeInFile: string | null;
  /** Lines the reader did not use (page buttons such as «التالي», or text that is in no known section). */
  ignored: string[];
  source: TitleFileSource;
  /** What the AI placed (the content a «confirm» would save); null for the fixed reader, which saves from the text itself. */
  content: CareerContent | null;
  /** Texts the AI returned that are not in the file word for word (at most 25): the person checks them before confirming. */
  ungrounded: string[];
  /** The version of the content the AI read (what a confirm must send back as `expectedVersion`); null for the fixed reader. */
  baseVersion: number | null;
  /** Whether an AI service is switched on (the dialog offers the AI button only then). */
  aiAvailable: boolean;
}
