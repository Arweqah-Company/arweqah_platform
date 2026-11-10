import { describe, expect, it } from 'vitest';
import { levelOf, scoreOf, teamProblems, type CatalogItemDto, type GradeBand, type StageTemplate } from '@arweqah-platform/shared';
import { cleanTeam, evalBlock, pickedPoints, reviewState, reviewerLevel } from './team-evaluation.rules';

const TEMPLATE: StageTemplate = {
  stage: 1, name: 'التأسيس', resultsWeight: 60, behaviourWeight: 40, basicTotal: 100, cap: 125, ruleText: '', resultsNote: '',
  extra: [{ name: 'تعلم', points: 10 }, { name: 'مبادرات داخلية', points: 10 }, { name: 'مساهمة في النمو', points: 5 }],
  criteria: [{ name: 'المهام', share: 60 }, { name: 'الجودة', share: 40 }],
  behaviours: ['B1.1', 'B1.2', 'B1.3', 'B1.4'].map((code) => ({ code, name: code, question: '؟' })),
};
const BAND = (name: string, from: number | null, to: number | null): GradeBand => ({ name, range: '', from, to, description: '' });
const SCALE = [BAND('استثنائي', 110, null), BAND('يفوق التوقعات', 95, 109.9), BAND('يحقق التوقعات', 80, 94.9), BAND('يحتاج تحسينا', 65, 79.9), BAND('دون التوقعات', null, 65)];
const CATALOG: CatalogItemDto[] = [{ id: 'i1', kind: 'init', title: 'مبادرة', points: 4 }, { id: 'g1', kind: 'growth', title: 'نمو', points: 2 }];
const BASE = { template: TEMPLATE, learning: { approvedMinutes: 1440, stageMinutes: 2880 }, caps: { init: 10, growth: 5 } };

describe('The score formula of an evaluation (FR-120, plan 3.3), worked by hand', () => {
  it('weighs results and behaviours, adds half the learning points and the picks, and rounds to one decimal', () => {
    // results 0.6×80 + 0.4×90 = 84; behaviours (75+50+100+0)/4 = 56.25; basic 84×0.6 + 56.25×0.4 = 72.9; learning 24 of 48 h = 5; picks 4 + 2
    const score = scoreOf({ ...BASE, results: [80, 90], behaviours: { 'B1.1': 75, 'B1.2': 50, 'B1.3': 100, 'B1.4': 0 }, picks: { init: 4, growth: 2 } });
    expect(score).toEqual({ results: 84, behaviour: 56.3, basic: 72.9, learning: 5, init: 4, growth: 2, final: 83.9 });
    expect(levelOf(SCALE, score.final)?.name).toBe('يحقق التوقعات');
  });

  it('caps each pick kind, the learning at its points, and the final score at the cap of the stage', () => {
    const score = scoreOf({ ...BASE, learning: { approvedMinutes: 9999, stageMinutes: 2880 }, results: [100, 100], behaviours: { 'B1.1': 100, 'B1.2': 100, 'B1.3': 100, 'B1.4': 100 }, picks: { init: 15, growth: 9 } });
    expect(score).toMatchObject({ learning: 10, init: 10, growth: 5, final: 125 });
    expect(scoreOf({ ...BASE, results: [100, 100], behaviours: { 'B1.1': 100, 'B1.2': 100, 'B1.3': 100, 'B1.4': 100 }, picks: { init: 10, growth: 5 }, adjust: 50 }).final).toBe(125);
  });

  it('counts what is not scored as zero, and a stage with no learning minutes as no learning', () => {
    expect(scoreOf({ ...BASE, learning: { approvedMinutes: 100, stageMinutes: 0 }, results: [], behaviours: {}, picks: { init: 0, growth: 0 } })).toMatchObject({ results: 0, behaviour: 0, basic: 0, learning: 0, final: 0 });
  });

  it('puts a score in the band whose lower end it reaches, and below every band in the lowest', () => {
    expect(levelOf(SCALE, 110)?.name).toBe('استثنائي');
    expect(levelOf(SCALE, 94.9)?.name).toBe('يحقق التوقعات');
    expect(levelOf(SCALE, 95)?.name).toBe('يفوق التوقعات');
    expect(levelOf(SCALE, 64.9)?.name).toBe('دون التوقعات');
    expect(levelOf([], 90)).toBeNull();
  });
});

describe('The rules of the manager\'s evaluation (FR-120)', () => {
  it('blocks with the reason: no cycle, the self stage, the upper manager before the direct one, and the stages after the manager\'s', () => {
    expect(evalBlock(null, 'direct', false)).toBe('no_cycle');
    expect(evalBlock('self', 'direct', false)).toBe('not_started');
    expect(evalBlock('mgr', 'upper', false)).toBe('wait_direct');
    expect(evalBlock('mgr', 'upper', true)).toBeNull();
    expect(evalBlock('mgr', 'direct', false)).toBeNull();
    for (const stage of ['cal', 'appr', 'notif', 'obj', 'closed'] as const) expect(evalBlock(stage, 'direct', true)).toBe('stage_over');
  });

  it('writes at the direct level only for the direct manager, and at the upper level for anyone else in scope', () => {
    expect(reviewerLevel('u1', 'u1')).toBe('direct');
    expect(reviewerLevel('u2', 'u1')).toBe('upper');
    expect(reviewerLevel('u2', null)).toBe('direct'); // nobody is above to wait for: the first in scope is the direct level
  });

  it('names the state of a document: none, a draft, or sent', () => {
    expect(reviewState(undefined)).toBe('none');
    expect(reviewState({ sentAt: null })).toBe('draft');
    expect(reviewState({ sentAt: new Date() })).toBe('sent');
  });

  it('asks for every criterion and behaviour, a note at the levels that need one, and picks of the right kind', () => {
    const full = { results: { '0': 70, '1': 80 }, behaviours: { 'B1.1': { level: 75, note: '' }, 'B1.2': { level: 50, note: '' }, 'B1.3': { level: 75, note: '' }, 'B1.4': { level: 50, note: '' } }, initIds: ['i1'], growthIds: ['g1'] };
    expect(teamProblems(TEMPLATE, full, CATALOG)).toEqual([]);
    expect(teamProblems(TEMPLATE, { ...full, results: { '0': 70 }, behaviours: { ...full.behaviours, 'B1.1': { level: 100, note: 'قصير' }, 'B1.2': { note: '' }, 'X9': { level: 50, note: '' } }, initIds: ['g1', 'nope'] }, CATALOG)).toEqual(expect.arrayContaining([
      { field: 'results.1', code: 'result_missing' }, { field: 'behaviours.B1.1', code: 'note_short' }, { field: 'behaviours.B1.2', code: 'level_missing' }, { field: 'behaviours.X9', code: 'unknown_behaviour' }, { field: 'initIds', code: 'wrong_kind' }, { field: 'initIds', code: 'unknown_item' },
    ]));
  });

  it('sums the points of the picked items of one kind and drops what the catalog does not have', () => {
    expect(pickedPoints(['i1', 'i1', 'g1', 'x'], 'init', CATALOG)).toBe(4);
    expect(cleanTeam({ results: {}, behaviours: {}, initIds: ['i1', 'g1', 'i1'], growthIds: ['g1', 'x'] }, CATALOG)).toMatchObject({ initIds: ['i1'], growthIds: ['g1'] });
  });
});
