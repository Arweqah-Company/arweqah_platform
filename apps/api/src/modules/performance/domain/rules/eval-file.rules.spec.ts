import { describe, expect, it } from 'vitest';
import { SAMPLE_EVAL_FILE } from './fixtures/eval-file.sample';
import { isSound, parseEvalFile, parseRange } from './eval-file.rules';

const STAGE_NAMES = ['', 'التأسيس', 'التخصص', 'البراعة', 'القيادة التشغيلية', 'القيادة المؤسسية'];
const WEIGHTS: Record<number, [number, number]> = { 2: [50, 50], 3: [45, 55], 4: [40, 60], 5: [30, 70] };
const at = SAMPLE_EVAL_FILE.indexOf('سلم الدرجات');
const STAGE_1 = SAMPLE_EVAL_FILE.slice(0, at);
const TAIL = SAMPLE_EVAL_FILE.slice(at);

/** The sample stage written for another stage: its name, its codes and its weights (the same shape the concept used). */
function stageText(n: number): string {
  let t = STAGE_1.replace(/المرحلة 1 التأسيس/g, `المرحلة ${n} ${STAGE_NAMES[n]}`).replace(/B1\./g, `B${n}.`);
  const w = WEIGHTS[n];
  if (w) t = t.replace(/النتائج\n60%/g, `النتائج\n${w[0]}%`).replace(/السلوك\n40%/g, `السلوك\n${w[1]}%`);
  return t;
}
const ALL = [1, 2, 3, 4, 5].map(stageText).join('\n') + '\n' + TAIL;

describe('parseEvalFile: the stage of the sample (FR-118)', () => {
  const r = parseEvalFile(SAMPLE_EVAL_FILE);
  const stage = r.stages[0]!;

  it('reads the weights, the extra components and the cap', () => {
    expect(r.stages).toHaveLength(1);
    expect(stage).toMatchObject({ stage: 1, name: 'التأسيس', problems: [] });
    expect(stage.template).toMatchObject({ resultsWeight: 60, behaviourWeight: 40, basicTotal: 100, cap: 125 });
    expect(stage.template.extra).toEqual([{ name: 'تعلم', points: 10 }, { name: 'مبادرات داخلية', points: 10 }, { name: 'مساهمة في النمو', points: 5 }]);
    expect(stage.template.ruleText).toMatch(/^يقيم المدير المباشر/);
  });

  it('reads the results criteria with their shares and the note, and the behaviours with their questions', () => {
    expect(stage.template.criteria.map((c) => c.share)).toEqual([30, 25, 20, 15, 10]);
    expect(stage.template.criteria[2]!.name).toBe('تقييم المشاريع المخدومة (آلي)');
    expect(stage.template.resultsNote).toMatch(/^مهام مقبولة/);
    expect(stage.template.behaviours.map((b) => b.code)).toEqual(['B1.1', 'B1.2', 'B1.3', 'B1.4']);
    expect(stage.template.behaviours[0]).toEqual({ code: 'B1.1', name: 'الانضباط', question: 'هل يلتزم بالمواعيد والإجراءات المعلنة؟' });
  });

  it('reads the grade scale into five bands with their ranges', () => {
    expect(r.scale?.problems).toEqual([]);
    expect(r.scale?.bands.map((b) => [b.name, b.from, b.to])).toEqual([['استثنائي', 110, null], ['يفوق التوقعات', 95, 109.9], ['يحقق التوقعات', 80, 94.9], ['يحتاج تحسينا', 65, 79.9], ['دون التوقعات', null, 65]]);
    expect(r.scale?.bands[0]!.description).toMatch(/^تجاوز المستهدفات/);
  });

  it('reads the fiscal-year card: twelve months with their kind, and the notes', () => {
    expect(r.fiscal?.problems).toEqual([]);
    expect(r.fiscal?.card.months).toHaveLength(12);
    expect(r.fiscal?.card.months[0]).toEqual({ month: 'أبريل', kind: 'محطة' });
    expect(r.fiscal?.card.notes.some((n) => n.month === 'يوليو')).toBe(true);
    expect(r.fiscal?.card.notes.some((n) => n.month === 'أشهر بلا محطة')).toBe(true);
    expect(isSound(r)).toBe(true);
  });
});

describe('parseEvalFile: one file for five stages', () => {
  const r = parseEvalFile(ALL);
  it('reads each stage on its own with its number, name and weights', () => {
    expect(r.stages.map((s) => [s.stage, s.name])).toEqual([[1, 'التأسيس'], [2, 'التخصص'], [3, 'البراعة'], [4, 'القيادة التشغيلية'], [5, 'القيادة المؤسسية']]);
    expect(r.stages.map((s) => [s.template.resultsWeight, s.template.behaviourWeight])).toEqual([[60, 40], [50, 50], [45, 55], [40, 60], [30, 70]]);
    expect(r.stages[4]!.template.behaviours.map((b) => b.code)[0]).toBe('B5.1');
    expect(r.stages.every((s) => s.problems.length === 0)).toBe(true);
    expect(r.scale?.bands).toHaveLength(5);
    expect(r.fiscal?.card.months).toHaveLength(12);
    expect(isSound(r)).toBe(true);
  });
});

describe('parseEvalFile: what it refuses to call sound', () => {
  it('a results/behaviour split that does not make the basic total', () => {
    const r = parseEvalFile(SAMPLE_EVAL_FILE.replace('النتائج\n60%', 'النتائج\n50%'));
    expect(r.stages[0]!.problems).toContain('basic_split');
    expect(isSound(r)).toBe(false);
  });

  it('criteria whose shares are not a hundred', () => {
    expect(parseEvalFile(SAMPLE_EVAL_FILE.replace('30%\nالمهام المقبولة', '35%\nالمهام المقبولة')).stages[0]!.problems).toContain('criteria_sum');
  });

  it('a cap that is not the basic plus the extra', () => {
    expect(parseEvalFile(SAMPLE_EVAL_FILE.replace('المجموع\n125%', 'المجموع\n120%')).stages[0]!.problems).toContain('cap_sum');
  });

  it('a behaviour with no question, and a stage with no behaviours', () => {
    const noQuestion = SAMPLE_EVAL_FILE.replace('هل يلتزم بالمواعيد والإجراءات المعلنة؟', '');
    expect(parseEvalFile(noQuestion).stages[0]!.problems).toContain('behaviour_question');
    const none = SAMPLE_EVAL_FILE.slice(0, SAMPLE_EVAL_FILE.indexOf('B1.1')) + SAMPLE_EVAL_FILE.slice(SAMPLE_EVAL_FILE.indexOf('سلم الدرجات'));
    expect(parseEvalFile(none).stages[0]!.problems).toContain('no_behaviours');
  });

  it('a stage that appears twice, a scale with fewer than five levels and a card with fewer than twelve months', () => {
    expect(parseEvalFile(stageText(1) + '\n' + stageText(1)).stages.every((s) => s.problems.includes('duplicate_stage'))).toBe(true);
    const fewer = SAMPLE_EVAL_FILE.replace('دون التوقعات\nالنهائي أقل من 65\nلم يحقق الحد الأدنى في النتائج أو السلوك\n', '');
    expect(parseEvalFile(fewer).scale?.problems).toContain('scale_levels');
    expect(parseEvalFile(SAMPLE_EVAL_FILE.replace('مارس\nمحطة\nأبريل', 'أبريل')).fiscal?.problems).toContain('fiscal_months');
  });

  it('an empty text holds nothing, and a text of only the scale holds only the scale', () => {
    expect(isSound(parseEvalFile('لا شيء هنا'))).toBe(false);
    const only = parseEvalFile(TAIL);
    expect(only.stages).toEqual([]);
    expect(only.scale?.bands).toHaveLength(5);
    expect(isSound(only)).toBe(true);
  });
});

describe('parseEvalFile: review findings (PR 67)', () => {
  it('refuses a stage number outside one to five (it would be saved but never make the cycle ready)', () => {
    const r = parseEvalFile(SAMPLE_EVAL_FILE.replace(/المرحلة 1 التأسيس/g, 'المرحلة 9 التأسيس'));
    expect(r.stages[0]!.problems).toContain('stage_range');
    expect(isSound(r)).toBe(false);
  });

  it('counts twelve DISTINCT months in the fiscal card, not twelve lines', () => {
    const lines = SAMPLE_EVAL_FILE.split('\n');
    const at = lines.indexOf('أبريل');
    const same = lines.map((l, i) => (i > at && i < at + 24 && ['مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس'].includes(l) ? 'أبريل' : l)).join('\n');
    expect(parseEvalFile(same).fiscal?.problems).toContain('fiscal_months');
  });

  it('reads a very long line of digits in linear time and calls the range not understood', () => {
    const long = '1'.repeat(150_000);
    const text = SAMPLE_EVAL_FILE.replace('النهائي 110 فأكثر', `النهائي ${long} فأكثر`);
    const started = Date.now();
    const r = parseEvalFile(text);
    expect(Date.now() - started).toBeLessThan(500);
    expect(r.scale?.problems).toContain('scale_range');
  });
});

describe('parseRange', () => {
  it('reads the three written forms and nothing else', () => {
    expect(parseRange('110 فأكثر')).toEqual({ from: 110, to: null });
    expect(parseRange('95 إلى 109.9')).toEqual({ from: 95, to: 109.9 });
    expect(parseRange('أقل من 65')).toEqual({ from: null, to: 65 });
    expect(parseRange('غير مفهوم')).toBeNull();
  });
});
