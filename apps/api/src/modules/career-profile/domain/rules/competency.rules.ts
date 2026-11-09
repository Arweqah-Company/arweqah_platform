import { COMPETENCY_LEVELS, type CareerContent, type CompetencyLevel, type CompetencyStatusDto } from '@arweqah-platform/shared';

const rank = (level: string | null | undefined): number => COMPETENCY_LEVELS.indexOf(level as CompetencyLevel) + 1;

/** The level a title asks for at the employee's own level (the first column of the table), or null when the competency does not belong to it. */
export function requiredLevel(values: readonly string[]): CompetencyLevel | null {
  const first = values[0];
  return rank(first) > 0 ? (first as CompetencyLevel) : null;
}

/** The competencies the title asks for, each with what was recorded and whether it is met (a recorded level at least the required one). */
export function competencyStatuses(content: CareerContent, recorded: ReadonlyMap<string, string>): CompetencyStatusDto[] {
  const out: CompetencyStatusDto[] = [];
  for (const c of content.competencies) {
    const required = requiredLevel(c.values);
    if (!required) continue;
    const mine = rank(recorded.get(c.name)) > 0 ? (recorded.get(c.name) as CompetencyLevel) : null;
    out.push({ name: c.name, required, mine, met: rank(mine) >= rank(required) });
  }
  return out;
}
