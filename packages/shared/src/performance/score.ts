import type { BehaviourLevel } from './self-evaluation';
import type { GradeBand, StageTemplate } from './template';

/**
 * The score formula of an evaluation (plan §3.3), pure so the server and the live card in the browser give the same number.
 * Results and behaviours are 0..100; the basic score weighs them by the stage; the three extra parts add up to the cap.
 */
export interface ScoreInput {
  template: StageTemplate;
  /** The manager's score for each results criterion, by position (0..100); a criterion not scored counts as 0. */
  results: readonly (number | undefined)[];
  /** The manager's level for each behaviour, by code; a behaviour not rated counts as 0. */
  behaviours: Readonly<Record<string, BehaviourLevel | undefined>>;
  /** Learning: approved minutes and the minutes of the stage. */
  learning: { approvedMinutes: number; stageMinutes: number };
  /** The points of the picked catalog items, per kind, already summed. */
  picks: { init: number; growth: number };
  /** The caps of the two catalog kinds. */
  caps: { init: number; growth: number };
  /** The calibration adjustment (zero until calibration exists). */
  adjust?: number;
}

export interface ScoreParts {
  results: number;
  behaviour: number;
  basic: number;
  learning: number;
  init: number;
  growth: number;
  final: number;
}

const round1 = (v: number): number => Math.round(v * 10) / 10;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);

/** `Σ share × score / 100` over the criteria of the stage. */
export const resultsScore = (template: StageTemplate, results: readonly (number | undefined)[]): number =>
  sum(template.criteria.map((c, i) => (c.share * clamp(results[i] ?? 0, 0, 100)) / 100));

/** The average of the behaviour levels of the stage. */
export const behaviourScore = (template: StageTemplate, levels: ScoreInput['behaviours']): number =>
  template.behaviours.length ? sum(template.behaviours.map((b) => levels[b.code] ?? 0)) / template.behaviours.length : 0;

/** The score of a person, in its parts. The final score is rounded to one decimal and never goes above the cap of the stage. */
export function scoreOf(input: ScoreInput): ScoreParts {
  const { template, learning, picks, caps } = input;
  const results = resultsScore(template, input.results);
  const behaviour = behaviourScore(template, input.behaviours);
  const basic = (results * template.resultsWeight + behaviour * template.behaviourWeight) / 100;
  const learnPoints = template.extra[0]?.points ?? 0;
  const learningPart = learning.stageMinutes > 0 ? Math.min(1, learning.approvedMinutes / learning.stageMinutes) * learnPoints : 0;
  const init = Math.min(caps.init, picks.init);
  const growth = Math.min(caps.growth, picks.growth);
  const final = clamp(round1(basic + learningPart + init + growth + (input.adjust ?? 0)), 0, template.cap);
  return { results: round1(results), behaviour: round1(behaviour), basic: round1(basic), learning: round1(learningPart), init, growth, final };
}

/** The band of a score: the highest band whose lower end it reaches; below every band it is the lowest one. The scale may come in any order. */
export function levelOf(scale: readonly GradeBand[], score: number): GradeBand | null {
  const ordered = [...scale].sort((a, b) => (a.from ?? -Infinity) - (b.from ?? -Infinity));
  let found: GradeBand | null = ordered[0] ?? null;
  for (const band of ordered) if (band.from !== null && score >= band.from) found = band;
  return found;
}
