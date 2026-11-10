import { z } from 'zod';
import type { CatalogItemDto, CycleStage } from './cycle';
import { BEHAVIOUR_LEVELS, SELF_NOTE_MAX, SELF_PICKS_MAX, type SelfEvaluationDto } from './self-evaluation';
import { formProblems } from './picks';
import type { ScoreParts } from './score';
import type { FiscalCard, GradeBand, StageTemplate } from './template';

/**
 * The manager's evaluation of a team member (FR-120; plan §3.5 and §3.5b). The direct manager scores first; the upper manager reviews and may
 * change. Each of them keeps their own copy, so what the direct manager entered is never lost.
 */
export const REVIEWER_LEVELS = ['direct', 'upper'] as const;
export type ReviewerLevel = (typeof REVIEWER_LEVELS)[number];

/** Why a manager cannot write an evaluation now (the server answers 409 with the code; the button says it in words). */
export const EVAL_BLOCKS = ['no_cycle', 'not_started', 'wait_direct', 'stage_over'] as const;
export type EvalBlock = (typeof EVAL_BLOCKS)[number];

const level = z.number().int().refine((v) => (BEHAVIOUR_LEVELS as readonly number[]).includes(v));

/** `PUT|POST /performance/evaluations/:employeeId`: the form of the manager. A draft may be half filled; a send must be complete. */
export const saveTeamEvaluationSchema = z.strictObject({
  /** By the position of the criterion in the stage template, 0..100. */
  results: z.record(z.string().max(3), z.number().min(0).max(100)),
  behaviours: z.record(z.string().max(12), z.strictObject({ level: level.optional(), note: z.string().max(SELF_NOTE_MAX) })),
  initIds: z.array(z.uuid()).max(SELF_PICKS_MAX),
  growthIds: z.array(z.uuid()).max(SELF_PICKS_MAX),
});
export type SaveTeamEvaluationInput = z.infer<typeof saveTeamEvaluationSchema>;

export const TEAM_PROBLEMS = ['result_missing', 'level_missing', 'note_short', 'unknown_behaviour', 'unknown_item', 'wrong_kind'] as const;
export type TeamProblemCode = (typeof TEAM_PROBLEMS)[number];
export interface TeamProblem {
  /** `results.0`, `behaviours.B1.1`, `initIds`, `growthIds`… */
  field: string;
  code: TeamProblemCode;
}

/** The form of a manager without a thing written. */
export const emptyTeamForm = (): SaveTeamEvaluationInput => ({ results: {}, behaviours: {}, initIds: [], growthIds: [] });

/** What a form needs to be sent: every criterion scored, every behaviour rated, a note where the level asks for one, and items of the right kind. */
export function teamProblems(template: StageTemplate, input: SaveTeamEvaluationInput, catalog: readonly CatalogItemDto[]): TeamProblem[] {
  const problems: TeamProblem[] = [];
  template.criteria.forEach((_, i) => { if (input.results[String(i)] === undefined) problems.push({ field: `results.${i}`, code: 'result_missing' }); });
  return [...problems, ...formProblems(template, input, catalog)];
}

export const EVAL_TEAM_SCOPES = ['all', 'direct'] as const;
export const EVAL_TEAM_STATUSES = ['waiting', 'done'] as const;
export const evalTeamQuerySchema = z.strictObject({
  search: z.string().trim().max(100).optional(),
  scope: z.enum(EVAL_TEAM_SCOPES).default('all'),
  status: z.enum(EVAL_TEAM_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type TeamEvaluationQuery = z.infer<typeof evalTeamQuerySchema>;

/** How a member stands for the viewer: not started by the viewer, a draft kept, or sent. */
export type ReviewState = 'none' | 'draft' | 'sent';

export interface TeamEvaluationRowDto {
  employeeId: string;
  name: string;
  titleNameAr: string | null;
  titleNameEn: string | null;
  /** The direct manager's name, or null when it is the viewer. */
  directManagerName: string | null;
  isDirect: boolean;
  selfSent: boolean;
  /** The viewer's own copy. */
  mine: ReviewState;
  /** Null while nothing was scored. */
  score: number | null;
  levelName: string | null;
  /** Why the viewer cannot write now; null when they can. */
  block: EvalBlock | null;
}

export interface TeamEvaluationPageDto {
  cycle: { fiscalYear: number; stage: CycleStage } | null;
  items: TeamEvaluationRowDto[];
  total: number;
  page: number;
  pageSize: number;
  /** How many people wait for the viewer's evaluation (the box of notices). */
  waitingCount: number;
}

/** One member's full evaluation: the template, what they wrote, what the viewer wrote, and what the direct manager wrote (for the upper manager). */
export interface TeamEvaluationDto {
  employeeId: string;
  name: string;
  titleNameAr: string | null;
  titleNameEn: string | null;
  stage: number;
  template: StageTemplate;
  scale: GradeBand[];
  fiscal: FiscalCard;
  catalog: CatalogItemDto[];
  catalogCaps: { init: number; growth: number };
  learning: { approvedMinutes: number; stageMinutes: number };
  self: SelfEvaluationDto;
  /** The level the viewer writes at. */
  level: ReviewerLevel;
  /** The direct manager of the member, and the one above. */
  directManagerName: string | null;
  upperManagerName: string | null;
  /** The viewer's form, and (for the upper manager) the direct manager's, when there is one. */
  form: SaveTeamEvaluationInput;
  sentAt: string | null;
  directForm: SaveTeamEvaluationInput | null;
  block: EvalBlock | null;
  score: ScoreParts | null;
  levelName: string | null;
}
