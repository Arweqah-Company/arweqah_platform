import { CAREER_LEVELS, COMPETENCY_VALUES, LEARNING_PRIORITIES } from '@arweqah-platform/shared';
import { z } from 'zod';
import { deadlineOf } from './required-actions.rules';
import { durationMinutes } from './learning-duration.rules';
import type { TitleFileParts } from './title-file.rules';

/**
 * What the AI is asked to give back for a title file (plan §2.9): the four parts the fixed reader finds, as plain fields. Every field is
 * required (a part the file does not have is empty), and nothing here is computed by the model: minutes, deadlines and ids are made by the
 * platform from the words the model copied.
 */
const text = z.string();
export const aiTitleFileSchema = z.strictObject({
  summary: text,
  indicators: z.array(z.strictObject({ text, governing: z.boolean() })),
  responsibilities: z.array(z.strictObject({ title: text, tasks: z.array(text) })),
  ladder: z.array(z.strictObject({ level: z.enum(CAREER_LEVELS), title: text, current: z.boolean() })),
  transitionRule: text,
  pathUnit: text,
  pathTitle: text,
  steps: z.array(z.strictObject({ n: z.number().int(), label: text, title: text, meta: text })),
  output: text,
  certificates: text,
  competencyColumns: z.array(text),
  competencies: z.array(z.strictObject({ name: text, values: z.array(z.enum(COMPETENCY_VALUES)) })),
  badges: z.array(z.strictObject({ name: text, condition: text, hours: z.number().int() })),
  badgesRule: text,
  learningPeriods: z.array(
    z.strictObject({
      name: text,
      /** What the period's own heading states («13 وحدة · 39 ساعة و18 دقيقة»): zero and empty when the file states nothing. */
      statedUnits: z.number().int(),
      statedDuration: text,
      units: z.array(z.strictObject({ priority: z.enum(LEARNING_PRIORITIES), title: text, provider: text, duration: text, language: text })),
    }),
  ),
  required: z.array(z.strictObject({ when: text, lines: z.array(text) })),
  acknowledgement: text,
});
export type AiTitleFile = z.infer<typeof aiTitleFileSchema>;

/** The AI's answer as the four parts the shared checks read; the minutes and deadlines come from the platform's own readers. */
export function partsFromAi(ai: AiTitleFile): TitleFileParts {
  return {
    job: { summary: clean(ai.summary), kpis: ai.indicators.map((k) => ({ text: clean(k.text), governing: k.governing })), groups: ai.responsibilities.map((g) => ({ title: clean(g.title), tasks: g.tasks.map(clean) })), ignored: [] },
    dev: {
      ladder: ai.ladder.map((l) => ({ level: l.level, title: clean(l.title), current: l.current })),
      condition: clean(ai.transitionRule),
      unit: clean(ai.pathUnit),
      title: clean(ai.pathTitle),
      steps: ai.steps.map((s) => ({ n: s.n, label: clean(s.label), title: clean(s.title), meta: clean(s.meta) })),
      output: clean(ai.output),
      certificates: clean(ai.certificates),
      columns: ai.competencyColumns.map(clean),
      competencies: ai.competencies.map((c) => ({ name: clean(c.name), values: c.values })),
      ignored: [],
    },
    learning: {
      hoursDone: 0,
      badges: ai.badges.map((b) => ({ name: clean(b.name), condition: clean(b.condition), hours: b.hours })),
      rule: clean(ai.badgesRule),
      periods: ai.learningPeriods.map((p) => ({
        name: clean(p.name),
        header: p.statedUnits > 0 && p.statedDuration.trim() ? { count: p.statedUnits, text: clean(p.statedDuration), minutes: durationMinutes(p.statedDuration) } : null,
        units: p.units.map((u) => ({ priority: u.priority, title: clean(u.title), provider: clean(u.provider), duration: clean(u.duration), minutes: durationMinutes(u.duration), language: clean(u.language) })),
      })),
      ignored: [],
    },
    required: { items: ai.required.map((r) => ({ when: clean(r.when), lines: r.lines.map(clean).filter(Boolean), deadline: deadlineOf(r.when) })), acknowledgement: clean(ai.acknowledgement), ignored: [] },
  };
}

const clean = (value: string): string => value.replace(/\s+/g, ' ').trim();

/** How many texts to show a person: the rest would only be noise. */
export const UNGROUNDED_MAX = 25;
/** A text shorter than this is a code or a number (a level, an hour count) and is not worth checking against the file. */
const GROUNDING_MIN_CHARS = 4;

/** Whitespace, final punctuation and the stretching mark do not count as a difference between what the file says and what the AI copied. */
const normal = (value: string): string => withoutMarks(value).replace(/\s+/g, ' ').replace(/[.،؛:]+$/g, '').trim();

/** The stretching mark and the invisible direction marks that a word processor leaves inside a text. */
function withoutMarks(value: string): string {
  const ignored = (code: number): boolean => code === 0x640 || (code >= 0x200b && code <= 0x200f) || (code >= 0x202a && code <= 0x202e);
  return [...value].filter((char) => !ignored(char.codePointAt(0) ?? 0)).join('');
}

/**
 * The texts the AI returned that are not in the file word for word. The AI is told to copy, and a person confirms the result; this shows them
 * the places where it did not copy (a reworded task, an invented unit), so they look there first.
 */
export function ungroundedOf(parts: TitleFileParts, source: string): string[] {
  const haystack = normal(source);
  const wanted = textsOf(parts).map(normal).filter((t) => t.length >= GROUNDING_MIN_CHARS);
  const missing = wanted.filter((t) => !haystack.includes(t));
  return [...new Set(missing)].slice(0, UNGROUNDED_MAX);
}

function textsOf({ job, dev, learning, required }: TitleFileParts): string[] {
  return [
    job.summary,
    ...job.kpis.map((k) => k.text),
    ...job.groups.flatMap((g) => [g.title, ...g.tasks]),
    ...dev.ladder.map((l) => l.title),
    dev.condition,
    dev.unit,
    dev.title,
    ...dev.steps.flatMap((s) => [s.label, s.title, s.meta]),
    dev.output,
    dev.certificates,
    ...dev.columns,
    ...dev.competencies.map((c) => c.name),
    ...learning.badges.flatMap((b) => [b.name, b.condition]),
    learning.rule,
    ...learning.periods.flatMap((p) => [p.name, ...p.units.flatMap((u) => [u.title, u.provider, u.duration])]),
    ...required.items.flatMap((r) => [r.when, ...r.lines]),
    required.acknowledgement,
  ];
}
