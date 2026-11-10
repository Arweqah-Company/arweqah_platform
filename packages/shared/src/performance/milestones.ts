import { z } from 'zod';

/**
 * The milestones of the year (FR-121; plan §3.5c): two short reviews, two pulses, and the warning grade that does not run this year. The calendar is fixed here:
 * the dates come from the fiscal card of the evaluation file (the milestone months), not from a table of their own.
 */
export const MILESTONE_KINDS = ['review', 'pulse', 'warning'] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export interface MilestoneDef {
  key: string;
  kind: MilestoneKind;
  month: number;
  day: number;
  /** The milestone does not run this year (the warning grade). */
  skipped: boolean;
}

export const MILESTONES: readonly MilestoneDef[] = [
  { key: 'review_jan', kind: 'review', month: 1, day: 15, skipped: false },
  { key: 'pulse_mar', kind: 'pulse', month: 3, day: 15, skipped: false },
  { key: 'review_jul', kind: 'review', month: 7, day: 15, skipped: false },
  { key: 'pulse_sep', kind: 'pulse', month: 9, day: 15, skipped: false },
  { key: 'warning_oct', kind: 'warning', month: 10, day: 20, skipped: true },
];
export const MILESTONE_KEYS = MILESTONES.map((m) => m.key) as [string, ...string[]];

export const MILESTONE_ACTION_MIN = 5;
export const MILESTONE_TEXT_MAX = 1000;

/** `PUT /performance/team/:employeeId/milestones/:key`: the minutes. A review needs the agreed action; a pulse is a short note. */
export const recordMilestoneSchema = z.strictObject({
  whereWeAre: z.string().trim().max(MILESTONE_TEXT_MAX).default(''),
  obstacle: z.string().trim().max(MILESTONE_TEXT_MAX).default(''),
  agreedAction: z.string().trim().max(MILESTONE_TEXT_MAX).default(''),
  note: z.string().trim().max(MILESTONE_TEXT_MAX).default(''),
});
export type RecordMilestoneInput = z.infer<typeof recordMilestoneSchema>;

/** What the minutes of a milestone of this kind must have (empty when they are complete). */
export function milestoneProblems(kind: MilestoneKind, input: RecordMilestoneInput): string[] {
  if (kind === 'review') return input.agreedAction.length >= MILESTONE_ACTION_MIN ? [] : ['agreedAction'];
  return kind === 'pulse' && input.note.length === 0 ? ['note'] : [];
}

/** Where a milestone stands: not recorded, recorded, recorded and the employee read it, or it does not run this year. */
export type MilestoneState = 'none' | 'recorded' | 'acknowledged' | 'skipped';

export interface MilestoneRecordDto extends RecordMilestoneInput {
  recordedAt: string;
  acknowledgedAt: string | null;
}

export interface MilestoneRowDto {
  key: string;
  kind: MilestoneKind;
  month: number;
  day: number;
  state: MilestoneState;
  record: MilestoneRecordDto | null;
}

export interface MilestoneListDto {
  /** Null when no cycle is open. */
  fiscalYear: number | null;
  items: MilestoneRowDto[];
}
