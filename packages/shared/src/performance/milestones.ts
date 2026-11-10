import { z } from 'zod';

/**

 * The milestones of the year (FR-121; plan §3.5c and §3.6c): two short reviews, two pulses, and the warning grade that does not run this year. The date of each is a date of
 * the cycle that HR sets (usual: the 15th of January and March of the year after the fiscal year starts, of July and September in it).
 */
export const MILESTONE_KINDS = ['review', 'pulse', 'warning'] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];

export interface MilestoneDef {
  key: string;
  kind: MilestoneKind;
  /** The milestone does not run this year (the warning grade). */
  skipped: boolean;
}

export const MILESTONES: readonly MilestoneDef[] = [
  { key: 'review_jan', kind: 'review', skipped: false },
  { key: 'pulse_mar', kind: 'pulse', skipped: false },
  { key: 'review_jul', kind: 'review', skipped: false },
  { key: 'pulse_sep', kind: 'pulse', skipped: false },
  { key: 'warning_oct', kind: 'warning', skipped: true },
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
  /** The date HR set for it in the cycle (YYYY-MM-DD); null for the milestone that does not run. */
  date: string | null;
  state: MilestoneState;
  record: MilestoneRecordDto | null;
}

export interface MilestoneListDto {
  /** Null when no cycle is open. */
  fiscalYear: number | null;
  items: MilestoneRowDto[];
}
