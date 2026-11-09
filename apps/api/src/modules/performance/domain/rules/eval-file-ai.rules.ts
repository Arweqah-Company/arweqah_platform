import { UNGROUNDED_MAX, ungroundedTexts } from '../../../../common/domain/grounding';
import { FISCAL_KINDS, type EvalFileContent } from '@arweqah-platform/shared';
import { z } from 'zod';

/**
 * What the AI is asked to give back for an evaluation file: the stages, the grade scale and the fiscal-year card, as plain fields. Nothing is computed
 * by the model: the basic total, the cap and the text of each range are made by the platform from the numbers the model copied. A part the file does not
 * have is empty. A range limit that is open is an empty string (the model fills numbers as text).
 */
const text = z.string();
const num = z.number();
export const aiEvalFileSchema = z.strictObject({
  stages: z.array(
    z.strictObject({
      stage: z.number().int(),
      name: text,
      resultsWeight: num,
      behaviourWeight: num,
      extra: z.array(z.strictObject({ name: text, points: num })),
      ruleText: text,
      resultsNote: text,
      criteria: z.array(z.strictObject({ name: text, share: num })),
      behaviours: z.array(z.strictObject({ code: text, name: text, question: text })),
    }),
  ),
  scale: z.array(z.strictObject({ name: text, from: text, to: text, description: text })),
  fiscalMonths: z.array(z.strictObject({ month: text, kind: z.enum(FISCAL_KINDS) })),
  fiscalNotes: z.array(z.strictObject({ month: text, text })),
});
export type AiEvalFile = z.infer<typeof aiEvalFileSchema>;

const clean = (value: string): string => value.replace(/\s+/g, ' ').trim();
/** A range limit the model wrote as text: a number, or nothing when the end is open. */
const limit = (value: string): number | null => {
  const n = Number(clean(value));
  return clean(value) === '' || !Number.isFinite(n) ? null : n;
};

/** The AI's answer as the content the checks read (and a person confirms). Parts the file lacks are left out (`null`, no stage). */
export function contentFromAi(ai: AiEvalFile): EvalFileContent {
  return {
    stages: ai.stages.map((s) => ({
      stage: s.stage, name: clean(s.name), resultsWeight: s.resultsWeight, behaviourWeight: s.behaviourWeight, extra: s.extra.map((e) => ({ name: clean(e.name), points: e.points })),
      ruleText: clean(s.ruleText), resultsNote: clean(s.resultsNote), criteria: s.criteria.map((c) => ({ name: clean(c.name), share: c.share })), behaviours: s.behaviours.map((b) => ({ code: clean(b.code), name: clean(b.name), question: clean(b.question) })),
    })),
    scale: ai.scale.length ? { bands: ai.scale.map((b) => ({ name: clean(b.name), from: limit(b.from), to: limit(b.to), description: clean(b.description) })) } : null,
    fiscal: ai.fiscalMonths.length ? { months: ai.fiscalMonths.map((m) => ({ month: clean(m.month) as never, kind: m.kind })), notes: ai.fiscalNotes.map((n) => ({ month: clean(n.month), text: clean(n.text) })) } : null,
  };
}

/** The texts of the content that are not in the file word for word: the places where the model did not copy, for the reviewer to look at first. */
export function ungroundedOf(content: EvalFileContent, source: string): string[] {
  return ungroundedTexts(textsOf(content), source);
}

function textsOf(c: EvalFileContent): string[] {
  return [
    ...c.stages.flatMap((s) => [s.name, s.ruleText, s.resultsNote, ...s.extra.map((e) => e.name), ...s.criteria.map((x) => x.name), ...s.behaviours.flatMap((b) => [b.name, b.question])]),
    ...(c.scale?.bands.flatMap((b) => [b.name, b.description]) ?? []),
    ...(c.fiscal?.notes.map((n) => n.text) ?? []),
  ];
}

export { UNGROUNDED_MAX };
