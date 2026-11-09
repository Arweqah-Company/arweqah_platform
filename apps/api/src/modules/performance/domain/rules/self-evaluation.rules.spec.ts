import { describe, expect, it } from 'vitest';
import type { CatalogItemDto, SaveSelfEvaluationInput, StageTemplate } from '@arweqah-platform/shared';
import { cleanSelf, emptySelf, selfEditable, selfProblems } from './self-evaluation.rules';

const T = { stage: 1, name: 'التأسيس', resultsWeight: 60, behaviourWeight: 40, basicTotal: 100, extra: [], cap: 125, ruleText: '', resultsNote: '', criteria: [], behaviours: [{ code: 'B1.1', name: 'الانضباط', question: 'q' }, { code: 'B1.2', name: 'المراجعة', question: 'q' }] } as StageTemplate;
const INIT = '11111111-1111-4111-8111-111111111111';
const GROWTH = '22222222-2222-4222-8222-222222222222';
const CATALOG: CatalogItemDto[] = [{ id: INIT, kind: 'init', title: 'مبادرة', points: 4 }, { id: GROWTH, kind: 'growth', title: 'نمو', points: 2 }];
const form = (over: Partial<SaveSelfEvaluationInput> = {}): SaveSelfEvaluationInput => ({ behaviours: { 'B1.1': { level: 75, note: '' }, 'B1.2': { level: 50, note: '' } }, achievements: {}, initIds: [], growthIds: [], ...over });

describe('selfEditable (FR-119)', () => {
  it('is open in the self stage, and in the manager stage until the manager starts', () => {
    expect(selfEditable('self', false)).toBe(true);
    expect(selfEditable('mgr', false)).toBe(true);
    expect(selfEditable('mgr', true)).toBe(false);
    for (const s of ['cal', 'appr', 'notif', 'obj', 'closed'] as const) expect(selfEditable(s, false)).toBe(false);
  });
});

describe('selfProblems', () => {
  it('accepts a complete form', () => expect(selfProblems(T, form(), CATALOG)).toEqual([]));

  it('asks for every behaviour of the stage to be rated', () => {
    expect(selfProblems(T, form({ behaviours: { 'B1.1': { level: 75, note: '' } } }), CATALOG)).toEqual([{ field: 'behaviours.B1.2', code: 'level_missing' }]);
    expect(selfProblems(T, emptySelf(), CATALOG).map((p) => p.code)).toEqual(['level_missing', 'level_missing']);
  });

  it('asks for a note of five characters at «always», «rarely» and «never», and not at the middle levels', () => {
    const at = (level: number, note: string) => selfProblems(T, form({ behaviours: { 'B1.1': { level, note }, 'B1.2': { level: 50, note: '' } } }), CATALOG);
    for (const level of [100, 25, 0]) expect(at(level, 'قصير')).toEqual([{ field: 'behaviours.B1.1', code: 'note_short' }]);
    for (const level of [100, 25, 0]) expect(at(level, 'ملاحظة كافية')).toEqual([]);
    for (const level of [75, 50]) expect(at(level, '')).toEqual([]);
    expect(at(100, '     ')).toHaveLength(1);
  });

  it('refuses a behaviour the stage does not have, an item that is not in the catalog, and an item of the other kind', () => {
    expect(selfProblems(T, form({ behaviours: { ...form().behaviours, 'B9.9': { level: 50, note: '' } } }), CATALOG)).toContainEqual({ field: 'behaviours.B9.9', code: 'unknown_behaviour' });
    expect(selfProblems(T, form({ initIds: ['33333333-3333-4333-8333-333333333333'] }), CATALOG)).toContainEqual({ field: 'initIds', code: 'unknown_item' });
    expect(selfProblems(T, form({ initIds: [GROWTH] }), CATALOG)).toContainEqual({ field: 'initIds', code: 'wrong_kind' });
    expect(selfProblems(T, form({ initIds: [INIT], growthIds: [GROWTH] }), CATALOG)).toEqual([]);
  });
});

describe('cleanSelf', () => {
  it('keeps only catalog items of the right kind, once each', () => {
    const cleaned = cleanSelf(form({ initIds: [INIT, INIT, GROWTH, '33333333-3333-4333-8333-333333333333'], growthIds: [GROWTH] }), CATALOG);
    expect(cleaned.initIds).toEqual([INIT]);
    expect(cleaned.growthIds).toEqual([GROWTH]);
  });
});
