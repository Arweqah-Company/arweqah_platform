import { z } from 'zod';
import type { CatalogItemDto, CycleStage } from './cycle';
import type { FiscalCard, GradeBand, StageTemplate } from './template';

/**
 * The self-evaluation (FR-119; plan §3.4): the employee rates the behaviours of their stage on the same five-step scale the manager uses, writes
 * their achievements for each results criterion (no score), and picks what they did from the catalog. The learning hours come by themselves.
 */
export const BEHAVIOUR_LEVELS = [100, 75, 50, 25, 0] as const;
export type BehaviourLevel = (typeof BEHAVIOUR_LEVELS)[number];
/** «Always», «rarely» and «never» need a note of at least this many characters. */
export const SELF_NOTE_MIN = 5;
export const SELF_NOTE_MAX = 500;
export const SELF_ACHIEVEMENT_MAX = 1000;
export const SELF_PICKS_MAX = 30;

/** The levels that ask for a note: the two ends of the scale and «rarely». */
export const levelNeedsNote = (level: number): boolean => level === 100 || level <= 25;

const level = z.number().int().refine((v) => (BEHAVIOUR_LEVELS as readonly number[]).includes(v));

/** `PUT /performance/me/self`: the form as it stands. Before the first send a half-filled form is kept as a draft; after it, the form must be complete. */
export const saveSelfEvaluationSchema = z.strictObject({
  /** By the code of the behaviour (`B1.1`). */
  behaviours: z.record(z.string().max(12), z.strictObject({ level: level.optional(), note: z.string().max(SELF_NOTE_MAX) })),
  /** By the position of the criterion in the stage template. */
  achievements: z.record(z.string().max(3), z.string().max(SELF_ACHIEVEMENT_MAX)),
  initIds: z.array(z.uuid()).max(SELF_PICKS_MAX),
  growthIds: z.array(z.uuid()).max(SELF_PICKS_MAX),
});
export type SaveSelfEvaluationInput = z.infer<typeof saveSelfEvaluationSchema>;

/** Why a form cannot be sent: each is one field and the check it failed. */
export const SELF_PROBLEMS = ['level_missing', 'note_short', 'unknown_behaviour', 'unknown_item', 'wrong_kind'] as const;
export type SelfProblemCode = (typeof SELF_PROBLEMS)[number];
export interface SelfProblem {
  /** `behaviours.B1.1`, `initIds`, `growthIds`… */
  field: string;
  code: SelfProblemCode;
}

export interface SelfEvaluationDto extends SaveSelfEvaluationInput {
  /** Null until the first send. */
  sentAt: string | null;
}

/** Where the person stands in the cycle, for the tab «my evaluation». */
export interface MyEvaluationDto {
  /** The cycle in progress; null while none is open. */
  cycle: { fiscalYear: number; stage: CycleStage; selfDeadline: string | null } | null;
  /** The person has an evaluation in this cycle (they hold a title whose stage has a template). */
  evaluation: {
    stage: number;
    stageName: string;
    template: StageTemplate;
    scale: GradeBand[];
    fiscal: FiscalCard;
    catalog: CatalogItemDto[];
    self: SelfEvaluationDto;
    /** The self-evaluation can still be written or changed. */
    editable: boolean;
    managerName: string | null;
    learning: { approvedMinutes: number; stageMinutes: number };
  } | null;
}
