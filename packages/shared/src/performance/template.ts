import { z } from 'zod';

/**
 * The evaluation file (FR-118; plan `docs/plans/phase-6-career-path-performance.md` §3.8): one file for the five development stages, then the grade
 * scale and the fiscal-year card. The server reads it, checks the weights and keeps what is sound; the cycle takes a snapshot of it when it opens.
 */
export const PERFORMANCE_STAGES = [1, 2, 3, 4, 5] as const;
export type PerformanceStage = (typeof PERFORMANCE_STAGES)[number];
export const SCALE_LEVELS = 5;
export const FISCAL_MONTHS = 12;
export const EVAL_FILE_MAX = 200_000;

/** A part of the score that is not the basic one: learning, internal initiatives, contribution to growth. */
export interface ExtraComponent {
  name: string;
  points: number;
}

export interface ResultsCriterion {
  name: string;
  /** The share of the results score, in percent; the shares of a stage add up to 100. */
  share: number;
}

export interface BehaviourItem {
  code: string;
  name: string;
  question: string;
}

/** One stage of the template: how the basic score is split, the extra components, the cap, the criteria and the behaviours. */
export interface StageTemplate {
  stage: number;
  name: string;
  resultsWeight: number;
  behaviourWeight: number;
  basicTotal: number;
  extra: ExtraComponent[];
  cap: number;
  ruleText: string;
  resultsNote: string;
  criteria: ResultsCriterion[];
  behaviours: BehaviourItem[];
}

/** A band of the grade scale. `from` is the lowest final score of the band (null for the lowest band, which has no lower end). */
export interface GradeBand {
  name: string;
  /** The range as the file wrote it. */
  range: string;
  from: number | null;
  to: number | null;
  description: string;
}

export interface FiscalMonth {
  month: string;
  kind: string;
}

export interface FiscalCard {
  months: FiscalMonth[];
  notes: { month: string; text: string }[];
}

/** Why a part of the file cannot be saved: each code is one check that failed. */
export const EVAL_PROBLEMS = ['basic_split', 'criteria_sum', 'cap_sum', 'no_criteria', 'no_behaviours', 'behaviour_question', 'duplicate_stage', 'stage_range'] as const;
export const SCALE_PROBLEMS = ['scale_levels', 'scale_range'] as const;
export const FISCAL_PROBLEMS = ['fiscal_months'] as const;
export type EvalProblem = (typeof EVAL_PROBLEMS)[number] | (typeof SCALE_PROBLEMS)[number] | (typeof FISCAL_PROBLEMS)[number];

export interface StageResult {
  stage: number;
  name: string;
  problems: EvalProblem[];
  template: StageTemplate;
}

/** What the evaluation file holds: the stages it carries, the scale and the fiscal card when it has them, and the lines that were not understood. */
export interface EvalFileResult {
  stages: StageResult[];
  scale: { bands: GradeBand[]; problems: EvalProblem[] } | null;
  fiscal: { card: FiscalCard; problems: EvalProblem[] } | null;
  ignored: string[];
  /** Whether everything it holds is sound and was saved (always false for a dry run). */
  saved: boolean;
}

export const evalFileSchema = z.strictObject({
  text: z.string().min(1).max(EVAL_FILE_MAX),
  /** Only report what the file holds (the default); `false` saves it when it is sound. */
  dryRun: z.boolean().default(true),
});
export type EvalFileInput = z.infer<typeof evalFileSchema>;

/** The templates kept, with the scale and the card, for the readiness list of the cycle page. */
export interface TemplatesDto {
  stages: StageTemplate[];
  scale: GradeBand[] | null;
  fiscal: FiscalCard | null;
}
