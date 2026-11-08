import type { CareerContent, CareerReadinessProblem } from '@arweqah-platform/shared';

/**
 * What still stops a title's career path from being set «ready» (plan §2.7): the job description needs a summary, indicators and
 * responsibilities; the development needs a ladder with the current title marked, a level path, a transition rule and competencies;
 * the required actions need at least one item and the acknowledgement sentence. The learning plan and the stage evaluation join
 * these checks when their stages are built.
 */
export function careerReadinessProblems(c: CareerContent): CareerReadinessProblem[] {
  const problems: CareerReadinessProblem[] = [];
  if (!(c.summary && c.kpis.length > 0 && c.responsibilities.length > 0)) problems.push('description');
  if (!(c.ladder.some((l) => l.current) && c.steps.length > 0 && c.transitionRule && c.competencies.length > 0)) problems.push('development');
  if (!(c.required.length > 0 && c.ackText)) problems.push('required');
  return problems;
}
