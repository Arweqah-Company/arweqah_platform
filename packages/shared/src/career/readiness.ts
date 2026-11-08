import type { CareerContent, CareerLearning, CareerReadinessProblem } from './content';

/**
 * What still stops a title's career path from being set «ready» (plan §2.7): the job description needs a summary, indicators and
 * responsibilities; the development needs a ladder with the current title marked, a level path, a transition rule and competencies;
 * the learning plan needs a badge and at least one unit, with period names that are not empty or repeated; the required actions need at least
 * one item and the acknowledgement sentence. The stage evaluation joins these checks when it is built.
 */
export function careerReadinessProblems(c: CareerContent): CareerReadinessProblem[] {
  const checks: [boolean, CareerReadinessProblem][] = [
    [!!c.summary && c.kpis.length > 0 && c.responsibilities.length > 0, 'description'],
    [c.ladder.some((l) => l.current) && c.steps.length > 0 && !!c.transitionRule && c.competencies.length > 0, 'development'],
    [learningComplete(c.learning), 'learning'],
    [c.required.length > 0 && !!c.ackText, 'required'],
  ];
  return checks.filter(([complete]) => !complete).map(([, problem]) => problem);
}

function learningComplete(l: CareerLearning): boolean {
  const names = l.periods.map((p) => p.name.trim());
  return l.badges.length > 0 && l.periods.some((p) => p.units.length > 0) && names.every(Boolean) && new Set(names).size === names.length;
}
