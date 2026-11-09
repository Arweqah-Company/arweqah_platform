import { z } from 'zod';
import { EVAL_FILE_MAX, FISCAL_KINDS, FISCAL_MONTHS, PERFORMANCE_STAGES, SCALE_LEVELS_MAX, SCALE_LEVELS_MIN, type EvalProblem, type GradeBand, type StageTemplate } from './template';

/**
 * Editing the evaluation file from the cycle page (plan §3.7ج): the same checks the file passes, as pure functions the server and the browser both run, so the form
 * says as it is typed what the server would refuse. The basic total and the cap are not typed: they follow from the weights and the extra components.
 */
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.001;
const BEHAVIOUR_CODE = /^B\d+\.\d+$/;

/** The months of the fiscal year, in the order of the card (April to March). */
export const FISCAL_MONTH_NAMES = ['أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس'] as const;

/** The checks of one stage: the weights, the shares, the cap, that every behaviour has its question and its own code. */
export function stageProblems(t: StageTemplate): EvalProblem[] {
  const problems: EvalProblem[] = [];
  if (!(PERFORMANCE_STAGES as readonly number[]).includes(t.stage)) problems.push('stage_range');
  if (!near(t.resultsWeight + t.behaviourWeight, t.basicTotal)) problems.push('basic_split');
  if (!t.criteria.length) problems.push('no_criteria');
  else if (!near(sum(t.criteria.map((c) => c.share)), 100)) problems.push('criteria_sum');
  if (!near(t.basicTotal + sum(t.extra.map((e) => e.points)), t.cap)) problems.push('cap_sum');
  if (!t.behaviours.length) problems.push('no_behaviours');
  else if (t.behaviours.some((b) => !b.question.trim())) problems.push('behaviour_question');
  const codes = t.behaviours.map((b) => b.code);
  if (codes.some((c) => !BEHAVIOUR_CODE.test(c)) || new Set(codes).size !== codes.length) problems.push('behaviour_code');
  return problems;
}

/** What the stage form sends: the basic total and the cap are left out (the server and `deriveStageTemplate` compute them). */
export const stageTemplateInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  resultsWeight: z.number().min(0).max(100),
  behaviourWeight: z.number().min(0).max(100),
  extra: z.array(z.strictObject({ name: z.string().trim().min(1).max(120), points: z.number().min(0).max(100) })).max(10),
  ruleText: z.string().trim().max(600),
  resultsNote: z.string().trim().max(1000),
  criteria: z.array(z.strictObject({ name: z.string().trim().min(1).max(160), share: z.number().min(0).max(100) })).max(30),
  behaviours: z.array(z.strictObject({ code: z.string().trim().max(20), name: z.string().trim().min(1).max(160), question: z.string().trim().max(600) })).max(40),
});
export type StageTemplateInput = z.infer<typeof stageTemplateInputSchema>;

/** The stage template of a form: the basic total is the two weights, and the cap is the basic total plus the points of the extra components. */
export function deriveStageTemplate(stage: number, input: StageTemplateInput): StageTemplate {
  const basicTotal = input.resultsWeight + input.behaviourWeight;
  return { stage, ...input, basicTotal, cap: basicTotal + sum(input.extra.map((e) => e.points)) };
}

/** The range of a band as the file writes it: «110 فأكثر», «95 إلى 109.9», «أقل من 65». */
export function formatBandRange(from: number | null, to: number | null): string {
  if (from === null) return `أقل من ${to ?? 0}`;
  return to === null ? `${from} فأكثر` : `${from} إلى ${to}`;
}

const bandInput = z.strictObject({ name: z.string().trim().min(1).max(80), from: z.number().nullable(), to: z.number().nullable(), description: z.string().trim().max(400) });
/** The bands (two to ten), the highest first (as the file lists them): the highest has no end, the lowest no start. */
export const scaleInputSchema = z.strictObject({ bands: z.array(bandInput).min(SCALE_LEVELS_MIN).max(SCALE_LEVELS_MAX) });
export type ScaleInput = z.infer<typeof scaleInputSchema>;

/** The bands of a form as the scale keeps them, with the range written out. */
export const buildBands = (input: ScaleInput): GradeBand[] => input.bands.map((b) => ({ name: b.name, range: formatBandRange(b.from, b.to), from: b.from, to: b.to, description: b.description }));

/** The scale has two to ten levels and its ranges follow one another, the highest first: the top one open above, the bottom one open below, none overlapping the next. */
export function scaleEditProblems(bands: readonly { from: number | null; to: number | null }[]): EvalProblem[] {
  if (bands.length < SCALE_LEVELS_MIN || bands.length > SCALE_LEVELS_MAX) return ['scale_levels'];
  const last = bands.length - 1;
  const shape = bands.every((b, i) => (i === 0 ? b.to === null && b.from !== null : i === last ? b.from === null && b.to !== null : b.from !== null && b.to !== null && b.from <= b.to));
  // The bottom band is «below N» (N itself is not in it), so its end may equal the start of the band above it; the others must not touch.
  const order = bands.every((b, i) => i === last || (i + 1 === last ? (b.from ?? Infinity) >= (bands[i + 1]!.to ?? -Infinity) : (b.from ?? Infinity) > (bands[i + 1]!.to ?? -Infinity)));
  return shape && order ? [] : ['scale_range'];
}

export const fiscalInputSchema = z.strictObject({
  months: z.array(z.strictObject({ month: z.enum(FISCAL_MONTH_NAMES), kind: z.enum(FISCAL_KINDS) })).length(FISCAL_MONTHS),
  notes: z.array(z.strictObject({ month: z.string().trim().min(1).max(40), text: z.string().trim().min(1).max(600) })).max(30),
});
export type FiscalInput = z.infer<typeof fiscalInputSchema>;

/** The card has the twelve months once each. */
export const fiscalEditProblems = (months: readonly { month: string }[]): EvalProblem[] => (months.length === FISCAL_MONTHS && new Set(months.map((m) => m.month)).size === FISCAL_MONTHS ? [] : ['fiscal_months']);

/** The five levels a new scale starts with, the highest first (the ranges are written from the numbers). */
export const DEFAULT_SCALE_BANDS: ScaleInput['bands'] = [
  { name: 'استثنائي', from: 110, to: null, description: 'تجاوز المستهدفات وأسهم في رفع أداء الوحدة أو القطاع' },
  { name: 'يفوق التوقعات', from: 95, to: 109.9, description: 'حقق المستهدفات وتجاوز بعضها مع إضافي قوي' },
  { name: 'يحقق التوقعات', from: 80, to: 94.9, description: 'أدى الدور كما هو مطلوب' },
  { name: 'يحتاج تحسينا', from: 65, to: 79.9, description: 'فجوة في محور أو أكثر' },
  { name: 'دون التوقعات', from: null, to: 65, description: 'لم يحقق الحد الأدنى في النتائج أو السلوك' },
];

/** The content of an evaluation file as a person reviews and confirms it: the stages as forms (the basic total and the cap are computed), the scale and the card. */
export const evalFileContentSchema = z.strictObject({
  stages: z.array(stageTemplateInputSchema.extend({ stage: z.number().int().min(1).max(5) })).max(5),
  scale: scaleInputSchema.nullable(),
  fiscal: fiscalInputSchema.nullable(),
});
export type EvalFileContent = z.infer<typeof evalFileContentSchema>;

export const confirmEvalFileSchema = z.strictObject({ content: evalFileContentSchema });
export type ConfirmEvalFileInput = z.infer<typeof confirmEvalFileSchema>;

export const analyzeEvalFileSchema = z.strictObject({ text: z.string().min(1).max(EVAL_FILE_MAX) });
export type AnalyzeEvalFileInput = z.infer<typeof analyzeEvalFileSchema>;
