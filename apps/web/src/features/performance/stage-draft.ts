import { deriveStageTemplate, stageProblems, stageTemplateInputSchema, type EvalProblem, type StageTemplate, type StageTemplateInput } from '@arweqah-platform/shared';

/** A stage template as the form holds it: every number as the text typed, so a field can be emptied while the person types. */
export interface StageDraft {
  name: string;
  resultsWeight: string;
  behaviourWeight: string;
  extra: { name: string; points: string }[];
  ruleText: string;
  resultsNote: string;
  criteria: { name: string; share: string }[];
  behaviours: { code: string; name: string; question: string }[];
}

export const blankStage = (name: string): StageDraft => ({ name, resultsWeight: '', behaviourWeight: '', extra: [], ruleText: '', resultsNote: '', criteria: [], behaviours: [] });

export const stageDraftOf = (t: StageTemplate): StageDraft => ({
  name: t.name, resultsWeight: String(t.resultsWeight), behaviourWeight: String(t.behaviourWeight), extra: t.extra.map((e) => ({ name: e.name, points: String(e.points) })), ruleText: t.ruleText, resultsNote: t.resultsNote,
  criteria: t.criteria.map((c) => ({ name: c.name, share: String(c.share) })), behaviours: t.behaviours.map((b) => ({ code: b.code, name: b.name, question: b.question })),
});

/** A number typed in a field: empty is NaN (which the rule refuses), not zero. */
export const numberOf = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text));
const total = (texts: readonly string[]): number => texts.reduce((a, x) => a + (Number.isFinite(numberOf(x)) ? numberOf(x) : 0), 0);

/** The next free behaviour code of a stage: `B<stage>.<n>`. */
export function nextBehaviourCode(stage: number, behaviours: readonly { code: string }[]): string {
  const used = behaviours.map((b) => Number(/^B\d+\.(\d+)$/.exec(b.code)?.[1] ?? 0));
  return `B${stage}.${Math.max(0, ...used) + 1}`;
}

export interface StageCheck {
  /** What the server takes, when every field is filled right; null while not. */
  input: StageTemplateInput | null;
  /** The checks the stage fails (the same rule the server runs); empty while `input` is null. */
  problems: EvalProblem[];
  /** The basic total and the cap that follow from the weights and the extra components, and the sum of the criteria shares (shown live). */
  basic: number;
  cap: number;
  shares: number;
}

/** Checks a draft by the rule the server uses: the fields first (names, numbers), then the weights, shares and questions of the template they make. */
export function checkStage(stage: number, d: StageDraft): StageCheck {
  const shown = { basic: total([d.resultsWeight, d.behaviourWeight]), cap: total([d.resultsWeight, d.behaviourWeight, ...d.extra.map((e) => e.points)]), shares: total(d.criteria.map((c) => c.share)) };
  const parsed = stageTemplateInputSchema.safeParse({ ...d, resultsWeight: numberOf(d.resultsWeight), behaviourWeight: numberOf(d.behaviourWeight), extra: d.extra.map((e) => ({ name: e.name, points: numberOf(e.points) })), criteria: d.criteria.map((c) => ({ name: c.name, share: numberOf(c.share) })) });
  if (!parsed.success) return { input: null, problems: [], ...shown };
  return { input: parsed.data, problems: stageProblems(deriveStageTemplate(stage, parsed.data)), ...shown };
}
