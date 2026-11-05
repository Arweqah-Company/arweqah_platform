export type DevelopmentStageCode = 'foundation' | 'specialization' | 'mastery' | 'operational_leadership' | 'institutional_leadership';

export interface DevelopmentStage {
  code: DevelopmentStageCode;
  hoursPerYear: number;
  budgetCap: number;
}

/** A stored rule: a grade (and optionally a track) gives a stage. A rule with a track wins over one without. */
export interface DevelopmentStageRule {
  grade: number;
  track: string | null;
  stage: DevelopmentStageCode;
}

/** The yearly hours and budget of each stage (the career-profile design, section 4.2). */
export const DEVELOPMENT_STAGES: Readonly<Record<DevelopmentStageCode, DevelopmentStage>> = {
  foundation: { code: 'foundation', hoursPerYear: 40, budgetCap: 3000 },
  specialization: { code: 'specialization', hoursPerYear: 48, budgetCap: 5000 },
  mastery: { code: 'mastery', hoursPerYear: 48, budgetCap: 8000 },
  operational_leadership: { code: 'operational_leadership', hoursPerYear: 56, budgetCap: 12000 },
  institutional_leadership: { code: 'institutional_leadership', hoursPerYear: 60, budgetCap: 18000 },
};

/** The starting rules written to the table; HR edits them afterwards. A grade and track with no rule has no stage. */
export const DEFAULT_STAGE_RULES: readonly DevelopmentStageRule[] = [
  { grade: 9, track: null, stage: 'foundation' },
  { grade: 8, track: null, stage: 'specialization' },
  { grade: 7, track: 'P', stage: 'specialization' },
  { grade: 7, track: 'J', stage: 'mastery' },
  { grade: 7, track: 'M', stage: 'operational_leadership' },
  { grade: 6, track: 'P', stage: 'mastery' },
  { grade: 6, track: 'J', stage: 'mastery' },
  { grade: 6, track: 'M', stage: 'operational_leadership' },
  { grade: 5, track: null, stage: 'operational_leadership' },
  { grade: 4, track: null, stage: 'institutional_leadership' },
  { grade: 3, track: null, stage: 'institutional_leadership' },
];

/** The stage of a grade and track, or null when no rule covers them (HR decides; nothing is guessed). */
export function stageFor(rules: readonly DevelopmentStageRule[], grade: number, track: string): DevelopmentStage | null {
  const exact = rules.find((r) => r.grade === grade && r.track === track);
  const general = rules.find((r) => r.grade === grade && r.track === null);
  const code = (exact ?? general)?.stage;
  return code ? (DEVELOPMENT_STAGES[code] ?? null) : null;
}
