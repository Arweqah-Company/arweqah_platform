import { describe, expect, it } from 'vitest';
import { aiEvalFileSchema, contentFromAi, UNGROUNDED_MAX, ungroundedOf } from './eval-file-ai.rules';
import { resultOfContent } from './eval-file-content.rules';
import { SAMPLE_EVAL_FILE } from './fixtures/eval-file.sample';
import { aiAnswerOf } from './fixtures/ai-eval-file.sample';

describe('The AI reading of an evaluation file (FR-118)', () => {
  const answer = aiAnswerOf(SAMPLE_EVAL_FILE);

  it('checks the shape of the answer and refuses a field that is not in the schema', () => {
    expect(aiEvalFileSchema.safeParse(answer).success).toBe(true);
    expect(aiEvalFileSchema.safeParse({ ...answer, extra: 1 }).success).toBe(false);
    expect(aiEvalFileSchema.safeParse({ ...answer, fiscalMonths: [{ month: 'أبريل', kind: 'other' }] }).success).toBe(false);
  });

  it('turns the answer into the content the checks read: the totals and the range texts are made here, an open limit is null', () => {
    const content = contentFromAi(answer);
    expect(content.stages[0]).toMatchObject({ stage: 1, resultsWeight: 60, behaviourWeight: 40 });
    expect(content.scale!.bands[0]).toMatchObject({ from: 110, to: null });
    expect(content.scale!.bands.at(-1)).toMatchObject({ from: null, to: 65 });
    const result = resultOfContent(content);
    expect(result.stages[0]).toMatchObject({ problems: [] });
    expect(result.stages[0]!.template).toMatchObject({ basicTotal: 100, cap: 125 });
    expect(result.scale).toMatchObject({ problems: [] });
    expect(result.scale!.bands[0]!.range).toBe('110 فأكثر');
    expect(result.fiscal).toMatchObject({ problems: [] });
  });

  it('leaves out the parts the file does not have', () => {
    const content = contentFromAi({ ...answer, stages: [], scale: [], fiscalMonths: [], fiscalNotes: [] });
    expect(content).toEqual({ stages: [], scale: null, fiscal: null });
  });

  it('says the checks a stage fails (a share that does not add up, a repeated stage)', () => {
    const content = contentFromAi(answer);
    const bad = { ...content, stages: [{ ...content.stages[0]!, criteria: [{ name: 'معيار', share: 60 }] }, content.stages[0]!] };
    const problems = resultOfContent(bad).stages.map((s) => s.problems);
    expect(problems[0]).toEqual(expect.arrayContaining(['criteria_sum', 'duplicate_stage']));
  });

  it('lists the texts that are not in the file word for word, ignoring spacing and a final full stop, at most 25', () => {
    const content = contentFromAi(answer);
    expect(ungroundedOf(content, SAMPLE_EVAL_FILE)).toEqual([]);
    const altered = { ...content, stages: [{ ...content.stages[0]!, name: 'اسم مخترع للمرحلة', behaviours: content.stages[0]!.behaviours.map((b) => ({ ...b, question: `${b.question} زيادة` })) }] };
    const missing = ungroundedOf(altered, SAMPLE_EVAL_FILE);
    expect(missing).toContain('اسم مخترع للمرحلة');
    expect(missing.length).toBeLessThanOrEqual(UNGROUNDED_MAX);
    expect(ungroundedOf(content, SAMPLE_EVAL_FILE.replace(/ /g, '  '))).toEqual([]);
  });
});
