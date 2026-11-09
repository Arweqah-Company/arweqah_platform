import { describe, expect, it } from 'vitest';
import { aiAnswerFor } from './fixtures/ai-title-file.sample';
import { SAMPLE_TITLE_FILE } from './fixtures/title-file.sample';
import { aiTitleFileSchema, partsFromAi, ungroundedOf, UNGROUNDED_MAX, type AiTitleFile } from './title-file-ai.rules';
import { contentProblems, partsOf, readingOf, readTitleFile } from './title-file.rules';

const CODE = 'OPS.01.01.01-L9P-01';

describe('Placing a title file with the AI (FR-127)', () => {
  const strict = readTitleFile(SAMPLE_TITLE_FILE, CODE);
  const ai = aiAnswerFor(partsOf(SAMPLE_TITLE_FILE));

  it('FR-127: an answer that says what the file says gives the same content, counts and checks as the fixed reader', () => {
    expect(aiTitleFileSchema.safeParse(ai).success).toBe(true);
    const placed = readingOf(partsFromAi(ai), CODE);
    expect(placed.problems).toEqual([]);
    expect(placed.counts).toEqual(strict.counts);
    expect(placed.content).toEqual(strict.content);
    expect(placed.codeInFile).toBe(CODE);
  });

  it('FR-127: minutes and deadlines are made by the platform from the copied words, not taken from the model', () => {
    const changed = { ...ai, learningPeriods: [{ ...ai.learningPeriods[0]!, units: [{ priority: 'إلزامي' as const, title: 'وحدة', provider: 'مزود', duration: 'ساعتان و30 دقيقة', language: 'عربي' }] }], required: [{ when: 'حتى 15 نوفمبر 2026', lines: ['أقرأ'] }, { when: 'فبراير ومارس 2027', lines: [] }] };
    const parts = partsFromAi(changed);
    expect(parts.learning.periods[0]?.units[0]?.minutes).toBe(150);
    expect(parts.required.items.map((i) => i.deadline)).toEqual(['2026-11-15', '2027-03-31']);
  });

  it('FR-127: the total a period states is checked against its units, like the fixed reader does', () => {
    const wrong = { ...ai, learningPeriods: ai.learningPeriods.map((p, i) => (i === 0 ? { ...p, statedUnits: 14 } : p)) };
    expect(readingOf(partsFromAi(wrong), CODE).problems).toContain('learning_total_mismatch');
  });

  it('FR-127: what the model leaves out is reported like the fixed reader reports it', () => {
    const empty: AiTitleFile = { ...ai, summary: '', ladder: ai.ladder.map((l) => ({ ...l, current: false })), badges: [], required: [], acknowledgement: '' };
    expect(readingOf(partsFromAi(empty), CODE).problems).toEqual(expect.arrayContaining(['summary_missing', 'current_title_unmarked', 'badges_missing', 'required_missing', 'acknowledgement_missing']));
  });

  it('FR-127: a code in the file that is another title\'s is a mismatch', () => {
    expect(readingOf(partsFromAi(ai), 'OPS.01.01.01-L7P-01').problems).toContain('code_mismatch');
  });

  it('FR-127: the schema refuses a level, a value or a priority that is not one of the known words', () => {
    expect(aiTitleFileSchema.safeParse({ ...ai, ladder: [{ level: 'L0', title: 'x', current: false }] }).success).toBe(false);
    expect(aiTitleFileSchema.safeParse({ ...ai, competencies: [{ name: 'x', values: ['متوسط'] }] }).success).toBe(false);
    expect(aiTitleFileSchema.safeParse({ ...ai, extra: 1 }).success).toBe(false);
  });

  it('FR-127: texts the file does not hold word for word are listed, and spacing, a final full stop and a stretched letter do not count', () => {
    const parts = partsFromAi(ai);
    expect(ungroundedOf(parts, SAMPLE_TITLE_FILE)).toEqual([]);
    const reworded = partsFromAi({ ...ai, responsibilities: [{ title: 'تحديد الفئة المستهدفة ودراستها', tasks: ['تحليل  مستهدفات المشروع وخصائص فئته.', 'مهمة لم ترد في الملف أبدا'] }] });
    expect(ungroundedOf(reworded, SAMPLE_TITLE_FILE)).toEqual(['مهمة لم ترد في الملف أبدا']);
  });

  it('FR-127: a short text (a level, a count) is not checked, and no more than 25 are returned', () => {
    const many = partsFromAi({ ...ai, indicators: Array.from({ length: 40 }, (_, i) => ({ text: `مؤشر مخترع رقم ${i}`, governing: false })) });
    expect(ungroundedOf(many, SAMPLE_TITLE_FILE)).toHaveLength(UNGROUNDED_MAX);
    expect(ungroundedOf(partsFromAi({ ...ai, summary: 'ab' }), 'xyz')).not.toContain('ab');
  });

  it('FR-127: the checks of a content placed earlier need nothing but the content and the title\'s code', () => {
    expect(contentProblems(strict.content, CODE)).toEqual([]);
    expect(contentProblems({ ...strict.content, summary: '' }, CODE)).toEqual(['summary_missing']);
    expect(contentProblems(strict.content, 'GRW.01.00.00-L7P-01')).toEqual(['code_mismatch']);
  });

  it('FR-127: a ladder listed from the top down (L1 first) is stored in the order it is climbed, like one listed from the entry up', () => {
    const topDown = { ...ai, ladder: [...ai.ladder].reverse() };
    const placed = readingOf(partsFromAi(topDown), CODE).content;
    expect(placed.ladder).toEqual(strict.content.ladder);
    expect(placed.ladder.map((l) => l.level)).toEqual(['L9', 'L7', 'L6', 'L5', 'L4', 'L3', 'L2', 'L1'].filter((l) => placed.ladder.some((s) => s.level === l)));
    expect(placed.ladder[0]).toMatchObject({ current: true });
  });
});

