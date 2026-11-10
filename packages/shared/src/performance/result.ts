import { z } from 'zod';
import type { CatalogItemDto } from './cycle';
import type { ScoreParts } from './score';
import type { SaveTeamEvaluationInput } from './team-evaluation';
import type { GradeBand, StageTemplate } from './template';

/**
 * The frozen result of an evaluation (FR-122, FR-123; plan §3.6b): written when the approval holder approves, read by the employee after the individual
 * notification, and replaced when an accepted objection ends with the manager's new evaluation.
 */
export interface ResultBreakdown {
  /** The parts of the final score (results, behaviour, basic, learning, init, growth, final). */
  parts: ScoreParts;
  /** The manager's form the score came from. */
  form: SaveTeamEvaluationInput;
  managerScore: number;
  adjustment: number;
  reason: string | null;
}

/** Five working days after the notification an objection can no longer be raised. */
export const OBJECTION_WORKING_DAYS = 5;
export const OBJECTION_REASON_MIN = 10;
export const OBJECTION_REASON_MAX = 1000;

export const OBJECTION_KINDS = ['criterion', 'behaviour', 'extra'] as const;
export type ObjectionKind = (typeof OBJECTION_KINDS)[number];
/** `open` waits for the approval holder; `returned` was accepted and waits for the manager; `reevaluated` waits for the final approval; `finalized` and `rejected` are over. */
export const PERFORMANCE_OBJECTION_STATUSES = ['open', 'returned', 'reevaluated', 'finalized', 'rejected'] as const;
export type PerformanceObjectionStatus = (typeof PERFORMANCE_OBJECTION_STATUSES)[number];
/** The statuses in which the objection is still being decided (the cycle cannot be closed while one is in them). */
export const OBJECTION_PENDING: readonly PerformanceObjectionStatus[] = ['open', 'returned', 'reevaluated'];

/** `POST /performance/me/objection`: one item, one reason. */
export const raiseObjectionSchema = z.strictObject({
  itemKind: z.enum(OBJECTION_KINDS),
  /** The position of the criterion, the code of the behaviour, or `init` / `growth` / `learning` for the extra component. */
  itemRef: z.string().trim().min(1).max(16),
  reason: z.string().trim().min(OBJECTION_REASON_MIN).max(OBJECTION_REASON_MAX),
});
export type RaiseObjectionInput = z.infer<typeof raiseObjectionSchema>;

/** `POST /performance/objections/:id/reject`: the reason the objection was refused. */
export const rejectObjectionSchema = z.strictObject({ reason: z.string().trim().min(OBJECTION_REASON_MIN).max(OBJECTION_REASON_MAX) });
export type RejectObjectionInput = z.infer<typeof rejectObjectionSchema>;

export interface ObjectionDto {
  id: string;
  itemKind: ObjectionKind;
  itemRef: string;
  reason: string;
  status: PerformanceObjectionStatus;
  decisionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
}

/** One objection in the approval holder's list. */
export interface ObjectionRowDto extends ObjectionDto {
  employeeId: string;
  employeeName: string;
}

export interface ObjectionListDto {
  items: ObjectionRowDto[];
}

/** What the employee sees after the notification (never before: the server leaves it out). */
export interface MyResultDto {
  finalScore: number;
  levelName: string | null;
  breakdown: ResultBreakdown;
  template: StageTemplate;
  scale: GradeBand[];
  catalog: CatalogItemDto[];
  notifiedAt: string;
  /** The last day an objection may be raised. */
  objectionUntil: string | null;
  objection: ObjectionDto | null;
  /** An objection can be raised now (stage, window, none raised yet). */
  canObject: boolean;
}
