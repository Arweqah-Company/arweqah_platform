import type { AiEvalFile } from '../eval-file-ai.rules';
import { parseEvalFile } from '../eval-file.rules';

/** What the model would answer for a file: the parsed parts written as the AI schema asks (range limits as text, the totals left out). */
export function aiAnswerOf(file: string): AiEvalFile {
  const r = parseEvalFile(file);
  const limit = (n: number | null): string => (n === null ? '' : String(n));
  return {
    stages: r.stages.map(({ template: t }) => ({ stage: t.stage, name: t.name, resultsWeight: t.resultsWeight, behaviourWeight: t.behaviourWeight, extra: t.extra, ruleText: t.ruleText, resultsNote: t.resultsNote, criteria: t.criteria, behaviours: t.behaviours })),
    scale: (r.scale?.bands ?? []).map((b) => ({ name: b.name, from: limit(b.from), to: limit(b.to), description: b.description })),
    fiscalMonths: (r.fiscal?.card.months ?? []).map((m) => ({ month: m.month, kind: m.kind as 'محطة' | 'متابعة يومية' })),
    fiscalNotes: r.fiscal?.card.notes ?? [],
  };
}
