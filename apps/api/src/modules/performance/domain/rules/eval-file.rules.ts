import type { BehaviourItem, EvalFileResult, EvalProblem, ExtraComponent, FiscalCard, GradeBand, ResultsCriterion, StageResult, StageTemplate } from '@arweqah-platform/shared';
import { FISCAL_MONTHS, SCALE_LEVELS } from '@arweqah-platform/shared';

/** The months of the fiscal year, in the order the file lists them (April to March). */
const MONTHS = ['أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس'];
const MONTH_KINDS = ['محطة', 'متابعة يومية'];
const NOTE_MIN = 25;

const isPct = (x: string | undefined): boolean => /^\d+(\.\d+)?%$/.test(x ?? '');
const pct = (x: string | undefined): number => parseFloat(x ?? '');
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const near = (a: number, b: number): boolean => Math.abs(a - b) < 0.001;

type Section = '' | 'basic' | 'extra' | 'res' | 'beh';

/** What one stage block of the file holds, as written. */
interface Block {
  basicTotal: number | null;
  basic: Record<string, number>;
  extra: ExtraComponent[];
  cap: number | null;
  rule: string;
  resultsWeight: number | null;
  resultsStage: string;
  criteria: ResultsCriterion[];
  note: string;
  behaviourWeight: number | null;
  behaviours: BehaviourItem[];
}

const emptyBlock = (): Block => ({ basicTotal: null, basic: {}, extra: [], cap: null, rule: '', resultsWeight: null, resultsStage: '', criteria: [], note: '', behaviourWeight: null, behaviours: [] });

interface Step {
  sec: Section;
  skip: number;
}

interface HeadingRule {
  title: string;
  /** What must follow the percentage two lines down (the results and behaviours headings are told apart from other lines by it). */
  follows: RegExp | null;
  sec: Section;
  skip: number;
  apply: (block: Block, weight: number, after: string) => void;
}

const HEADINGS: HeadingRule[] = [
  { title: 'الأساسي', follows: null, sec: 'basic', skip: 1, apply: (b, w) => { b.basicTotal = w; } },
  { title: 'الإضافي', follows: null, sec: 'extra', skip: 1, apply: () => undefined },
  { title: 'النتائج', follows: /^معايير/, sec: 'res', skip: 2, apply: (b, w, after) => { b.resultsWeight = w; b.resultsStage = after; } },
  { title: 'السلوك', follows: /^سلوكيات/, sec: 'beh', skip: 2, apply: (b, w) => { b.behaviourWeight = w; } },
];

/** A heading that starts a section (the basic and extra totals, the results and the behaviours): sets what it carries on the block. */
function heading(block: Block, L: readonly string[], i: number): Step | null {
  const after = L[i + 2] ?? '';
  const rule = HEADINGS.find((h) => h.title === L[i] && isPct(L[i + 1]) && (h.follows?.test(after) ?? true));
  if (!rule) return null;
  rule.apply(block, pct(L[i + 1]), after);
  return { sec: rule.sec, skip: rule.skip };
}

/** The basic section: the two weights of the basic part. */
function inBasic(block: Block, L: readonly string[], i: number): Step {
  const l = L[i] ?? '';
  if (isPct(L[i + 1]) && (l === 'النتائج' || l === 'السلوك')) { block.basic[l] = pct(L[i + 1]); return { sec: 'basic', skip: 1 }; }
  return { sec: 'basic', skip: 0 };
}

/** The results section: the note, and each criterion with its share (the share comes first, then the name). */
function inResults(block: Block, L: readonly string[], i: number): Step {
  const l = L[i] ?? '';
  const n = L[i + 1];
  if (/^ما تعنيه/.test(l)) block.note = l.replace(/^ما تعنيه[^:]*:\s*/, '');
  else if (isPct(l) && n) { block.criteria.push({ name: n, share: pct(l) }); return { sec: 'res', skip: 1 }; }
  return { sec: 'res', skip: 0 };
}

/** The behaviours section. */
function inBehaviours(block: Block, L: readonly string[], i: number): Step {
  return CODE.test(L[i] ?? '') && L[i + 2] === 'سؤال المقيّم' ? behaviour(block, L, i) : { sec: 'beh', skip: 0 };
}

const READERS: Record<Section, (block: Block, L: readonly string[], i: number) => Step> = {
  '': () => ({ sec: '', skip: 0 }),
  basic: inBasic,
  extra: (block, L, i) => inExtra(block, L, i),
  res: inResults,
  beh: inBehaviours,
};

/** One line inside the section the scanner is in. */
const inSection = (block: Block, sec: Section, L: readonly string[], i: number): Step => READERS[sec](block, L, i);

const CODE = /^B\d+\.\d+$/;

/** A behaviour: its code, its name and the question of the evaluator; a missing question (the next line is already the next code) is kept empty so the check can name it. */
function behaviour(block: Block, L: readonly string[], i: number): Step {
  const next = L[i + 3];
  const asked = next !== undefined && !CODE.test(next) && next !== 'سلم الدرجات';
  block.behaviours.push({ code: L[i] as string, name: L[i + 1] ?? '', question: asked ? next : '' });
  return { sec: 'beh', skip: asked ? 3 : 2 };
}

/** The extra section: its components with their points, the total (the cap) and the sentence that ends it. */
function inExtra(block: Block, L: readonly string[], i: number): Step {
  const l = L[i] ?? '';
  const n = L[i + 1];
  if (l === 'المجموع' && isPct(n)) { block.cap = pct(n); return { sec: 'extra', skip: 1 }; }
  if (/^يقيم/.test(l)) { block.rule = l; return { sec: '', skip: 0 }; }
  if (!/^السقف/.test(l) && isPct(n)) { block.extra.push({ name: l, points: pct(n) }); return { sec: 'extra', skip: 1 }; }
  return { sec: 'extra', skip: 0 };
}

/** Reads the lines of one stage block of the file. */
export function readBlock(L: readonly string[]): Block {
  const block = emptyBlock();
  let sec: Section = '';
  for (let i = 0; i < L.length; i++) {
    if (L[i] === 'تقييم الأداء') continue;
    const step: Step = heading(block, L, i) ?? inSection(block, sec, L, i);
    sec = step.sec;
    i += step.skip;
  }
  return block;
}

/** The stage number and the name from the results heading («معايير المرحلة 1 التأسيس»), or the position when there is none. */
function stageIdentity(heading: string, position: number): { stage: number; name: string } {
  const m = /المرحلة\s*(\d+)\s*(\S+(?:\s+\S+)?)/.exec(heading);
  return m ? { stage: Number(m[1]), name: m[2] ?? '' } : { stage: position, name: '' };
}

/** The checks of one stage: the weights, the shares, the cap, and that every behaviour has its question. */
export function stageProblems(t: StageTemplate): EvalProblem[] {
  const problems: EvalProblem[] = [];
  if (!near(t.resultsWeight + t.behaviourWeight, t.basicTotal)) problems.push('basic_split');
  if (!t.criteria.length) problems.push('no_criteria');
  else if (!near(sum(t.criteria.map((c) => c.share)), 100)) problems.push('criteria_sum');
  if (!near(t.basicTotal + sum(t.extra.map((e) => e.points)), t.cap)) problems.push('cap_sum');
  if (!t.behaviours.length) problems.push('no_behaviours');
  else if (t.behaviours.some((b) => !b.question.trim())) problems.push('behaviour_question');
  return problems;
}

/** The weights of the basic part and the weights at the heads of the results and behaviours say the same (when both are there). */
function weightsAgree(block: Block): boolean {
  const pairs: [number | undefined, number | null][] = [[block.basic['النتائج'], block.resultsWeight], [block.basic['السلوك'], block.behaviourWeight]];
  return pairs.every(([basic, head]) => basic === undefined || head === null || near(basic, head));
}

function toTemplate(block: Block, who: { stage: number; name: string }): StageTemplate {
  const basic = block.basic;
  return {
    stage: who.stage, name: who.name, resultsWeight: basic['النتائج'] ?? block.resultsWeight ?? 0, behaviourWeight: basic['السلوك'] ?? block.behaviourWeight ?? 0,
    basicTotal: block.basicTotal ?? 0, extra: block.extra, cap: block.cap ?? 0, ruleText: block.rule, resultsNote: block.note, criteria: block.criteria, behaviours: block.behaviours,
  };
}

/** The range of a band as the file wrote it: «110 فأكثر», «95 إلى 109.9», «أقل من 65». */
export function parseRange(text: string): { from: number | null; to: number | null } | null {
  const upward = /(\d+(?:\.\d+)?)\s*فأكثر/.exec(text);
  if (upward) return { from: Number(upward[1]), to: null };
  const between = /(\d+(?:\.\d+)?)\s*إلى\s*(\d+(?:\.\d+)?)/.exec(text);
  if (between) return { from: Number(between[1]), to: Number(between[2]) };
  const below = /أقل من\s*(\d+(?:\.\d+)?)/.exec(text);
  return below ? { from: null, to: Number(below[1]) } : null;
}

interface Tail {
  bands: GradeBand[];
  months: FiscalCard['months'];
  notes: FiscalCard['notes'];
  ignored: string[];
}

/** The fiscal card: a month with its kind, a month with a long note, and the line about the months without a milestone. */
function fiscalLine(tail: Tail, L: readonly string[], i: number): number {
  const l = L[i] ?? '';
  const n = L[i + 1];
  if (/^من .* إلى /.test(l)) return 0;
  if (MONTHS.includes(l) && MONTH_KINDS.includes(n ?? '')) { tail.months.push({ month: l, kind: n as string }); return 1; }
  if (MONTHS.includes(l) && (n ?? '').length > NOTE_MIN) { tail.notes.push({ month: l, text: n as string }); return 1; }
  if (/بلا محطة رسمية/.test(l)) tail.notes.push({ month: 'أشهر بلا محطة', text: l });
  else tail.ignored.push(l);
  return 0;
}

/** A band of the scale: its name, then «النهائي <range>», then its description. */
function bandLine(tail: Tail, L: readonly string[], i: number): number {
  if (!/^النهائي/.test(L[i + 1] ?? '')) return 0;
  const range = L[i + 1]?.replace(/^النهائي\s*/, '') ?? '';
  const parsed = parseRange(range);
  tail.bands.push({ name: L[i] as string, range, from: parsed?.from ?? null, to: parsed?.to ?? null, description: L[i + 2] ?? '' });
  return 2;
}

/** The grade scale and the fiscal-year card, read once after the last stage. */
function readTail(L: readonly string[]): Tail {
  const tail: Tail = { bands: [], months: [], notes: [], ignored: [] };
  let sec: 'scale' | 'fiscal' = 'scale';
  for (let i = 0; i < L.length; i++) {
    if (L[i] === 'سلم الدرجات') sec = 'scale';
    else if (L[i] === 'بطاقة السنة المالية') sec = 'fiscal';
    else i += sec === 'fiscal' ? fiscalLine(tail, L, i) : bandLine(tail, L, i);
  }
  return tail;
}

function scaleResult(tail: Tail): EvalFileResult['scale'] {
  if (!tail.bands.length) return null;
  const problems: EvalProblem[] = [];
  if (tail.bands.length !== SCALE_LEVELS) problems.push('scale_levels');
  if (tail.bands.some((b) => parseRange(b.range) === null)) problems.push('scale_range');
  return { bands: tail.bands, problems };
}

function fiscalResult(tail: Tail): EvalFileResult['fiscal'] {
  if (!tail.months.length && !tail.notes.length) return null;
  return { card: { months: tail.months, notes: tail.notes }, problems: tail.months.length === FISCAL_MONTHS ? [] : ['fiscal_months'] };
}

/** Where each stage block starts: a line «الأساسي» followed by a percentage. */
function blockStarts(L: readonly string[]): number[] {
  return L.flatMap((x, i) => (x === 'الأساسي' && isPct(L[i + 1]) ? [i] : []));
}

/**
 * Reads an evaluation file: the stage blocks (each on its own), then the grade scale and the fiscal-year card once. Nothing is saved here; every part
 * carries the checks it failed, and a stage number that appears twice is a problem of both.
 */
export function parseEvalFile(text: string): Omit<EvalFileResult, 'saved'> {
  const L = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const starts = blockStarts(L);
  const tailAt = L.indexOf('سلم الدرجات');
  const end = tailAt >= 0 ? tailAt : L.length;
  const stages: StageResult[] = starts.map((from, k) => {
    const block = readBlock(L.slice(from, starts[k + 1] ?? end));
    const template = toTemplate(block, stageIdentity(block.resultsStage, k + 1));
    const problems = stageProblems(template);
    if (!weightsAgree(block) && !problems.includes('basic_split')) problems.push('basic_split');
    return { stage: template.stage, name: template.name, problems, template };
  });
  const seen = stages.map((s) => s.stage);
  for (const s of stages) if (seen.filter((x) => x === s.stage).length > 1) s.problems.push('duplicate_stage');
  const tail = readTail(tailAt >= 0 ? L.slice(tailAt) : []);
  return { stages, scale: scaleResult(tail), fiscal: fiscalResult(tail), ignored: tail.ignored };
}

/** Whether nothing in the result failed a check (what may be saved). */
export function isSound(result: Omit<EvalFileResult, 'saved'>): boolean {
  return result.stages.length + (result.scale ? 1 : 0) + (result.fiscal ? 1 : 0) > 0 && !result.stages.some((s) => s.problems.length) && !result.scale?.problems.length && !result.fiscal?.problems.length;
}
