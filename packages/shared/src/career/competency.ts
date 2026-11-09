import { z } from 'zod';

/**
 * The level of a technical competency an employee reached (FR-117; plan `docs/plans/phase-6-career-path-performance.md` §2.6). The competencies and
 * the level each asks for come from the title's content (the table «technical competencies», first column = the current level); the direct manager
 * records what the employee reached, and a competency is «met» when the recorded level is at least the required one.
 */
export const COMPETENCY_LEVELS = ['أساسي', 'خبير'] as const;
export type CompetencyLevel = (typeof COMPETENCY_LEVELS)[number];

/** `PUT /career-team/:employeeId/competencies`: the level reached for one competency, or null to take the record back. */
export const recordCompetencySchema = z.strictObject({
  competency: z.string().trim().min(1).max(120),
  level: z.enum(COMPETENCY_LEVELS).nullable(),
});
export type RecordCompetencyInput = z.infer<typeof recordCompetencySchema>;

export interface CompetencyStatusDto {
  name: string;
  /** What the title asks for at the employee's level. */
  required: CompetencyLevel;
  /** What the manager recorded; null when nothing is recorded. */
  mine: CompetencyLevel | null;
  met: boolean;
}

/** The yearly budget of the employee's stage and what was approved this year (the card on the employee's page). */
export interface BudgetDto {
  /** Null when no rule covers the grade and track of the title. */
  cap: number | null;
  spent: number;
}
