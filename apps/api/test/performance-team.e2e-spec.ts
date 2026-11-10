import { CorePermission, scoreOf, type CatalogItemDto, type SaveTeamEvaluationInput, type TeamEvaluationDto, type TeamEvaluationPageDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { evaluationScenario, grants } from './helpers/performance-keys';
import { useTestApp } from './setup/test-app';

const TEAM = [CorePermission.PerformanceTeamView, CorePermission.PerformanceTeamEvaluate, CorePermission.PerformanceTeamExport];

describe('Team evaluation: the manager scores the employee, then the upper manager (FR-120)', () => {
  const t = useTestApp();

  /** The employee (Rep) reports to the direct manager (Lead), who reports to the upper manager (Head); HR holds the cycle keys with the file saved and a catalog. */
  async function setup() {
    const { hr, ...s } = await evaluationScenario(t);
    const upperUser = await s.person(s.head, s.group, grants(TEAM));
    const directUser = await s.person(s.lead, s.group, grants(TEAM));
    const employeeUser = await s.person(s.rep, s.group, grants([CorePermission.PerformanceSelfEvaluate]));
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [directUser.employeeId, employeeUser.employeeId]);
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [upperUser.employeeId, directUser.employeeId]);
    const [upper, direct, employee] = [await t.factories.signIn(upperUser), await t.factories.signIn(directUser), await t.factories.signIn(employeeUser)];
    const init = (await hr.post('/api/performance/cycle/catalog').send({ kind: 'init', title: 'قيادة مبادرة تحسين', points: 4 }).expect(201)).body as CatalogItemDto;
    const growth = (await hr.post('/api/performance/cycle/catalog').send({ kind: 'growth', title: 'مساهمة في ورشة', points: 2 }).expect(201)).body as CatalogItemDto;
    const stageTo = async (stage: 'mgr' | 'cal') => { await hr.post('/api/performance/cycle/advance').expect(200); if (stage === 'cal') await hr.post('/api/performance/cycle/advance').expect(200); };
    const one = async (agent: typeof direct, id = employeeUser.employeeId) => (await agent.get(`/api/performance/team/${id}`).expect(200)).body as TeamEvaluationDto;
    /** A complete form for the template of the person's stage. */
    const complete = async (over: Partial<SaveTeamEvaluationInput> = {}): Promise<SaveTeamEvaluationInput> => {
      const dto = await one(direct);
      return {
        results: Object.fromEntries(dto.template.criteria.map((_, i) => [String(i), 80 + i])),
        behaviours: Object.fromEntries(dto.template.behaviours.map((b) => [b.code, { level: 75, note: '' }])),
        initIds: [init.id], growthIds: [growth.id], ...over,
      };
    };
    const open = () => hr.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    return { ...s, hr, upper, direct, employee, upperUser, directUser, employeeUser, init, growth, stageTo, one, complete, open };
  }

  const titles = async (agent: Awaited<ReturnType<typeof setup>>['direct']): Promise<string[]> => ((await agent.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr);
  /** The same score for every criterion of a form. */
const all = (form: SaveTeamEvaluationInput, score: number) => Object.fromEntries(Object.keys(form.results).map((k) => [k, score]));
const path = (s: Awaited<ReturnType<typeof setup>>) => `/api/performance/team/${s.employeeUser.employeeId}`;

  it('says there is no cycle before one is opened, and lists nobody', async () => {
    const s = await setup();
    expect((await s.direct.get('/api/performance/team').expect(200)).body).toMatchObject({ cycle: null, items: [], total: 0 });
    await s.direct.get(path(s)).expect(404);
  });

  it('lists the people under the manager with the manager\'s state, the direct manager, and the self-evaluation state; the scope filter narrows to direct reports', async () => {
    const s = await setup();
    await s.open();
    const all = (await s.upper.get('/api/performance/team').expect(200)).body as TeamEvaluationPageDto;
    expect(all.cycle).toMatchObject({ fiscalYear: 2026, stage: 'self' });
    const row = all.items.find((r) => r.employeeId === s.employeeUser.employeeId)!;
    expect(row).toMatchObject({ isDirect: false, selfSent: false, mine: 'none', score: null, block: 'not_started' });
    expect(row.directManagerName).toEqual(expect.any(String));
    expect(all.items.some((r) => r.employeeId === s.directUser.employeeId && r.isDirect)).toBe(true); // the upper manager is the direct manager of the lead
    const direct = (await s.upper.get('/api/performance/team?scope=direct').expect(200)).body as TeamEvaluationPageDto;
    expect(direct.items.map((r) => r.employeeId)).toEqual([s.directUser.employeeId]);
    const found = (await s.upper.get('/api/performance/team?search=%D8%B3%D8%B3%D8%B3%D8%B3%D8%B3').expect(200)).body as TeamEvaluationPageDto;
    expect(found.total).toBe(0);
  });

  it('blocks writing with a reason: before the manager\'s stage, for the upper manager before the direct one sent, and after the stage (409 EVALUATION_BLOCKED)', async () => {
    const s = await setup();
    await s.open();
    const empty = { results: {}, behaviours: {}, initIds: [], growthIds: [] };
    expect((await s.direct.put(path(s)).send(empty).expect(409)).body).toMatchObject({ code: 'EVALUATION_BLOCKED', details: { block: 'not_started' } });
    await s.stageTo('mgr');
    expect((await s.upper.put(path(s)).send(empty).expect(409)).body).toMatchObject({ code: 'EVALUATION_BLOCKED', details: { block: 'wait_direct' } });
    await s.direct.put(path(s)).send(empty).expect(200);
    await s.hr.post('/api/performance/cycle/advance').expect(200); // cal
    expect((await s.direct.put(path(s)).send(empty).expect(409)).body).toMatchObject({ details: { block: 'stage_over' } });
    expect((await s.direct.get(path(s)).expect(200)).body).toMatchObject({ block: 'stage_over' }); // still readable
  });

  it('keeps a draft without checking it and refuses to send an incomplete form (422 with each field and its problem)', async () => {
    const s = await setup();
    await s.open();
    await s.stageTo('mgr');
    const draft = (await s.direct.put(path(s)).send({ results: { '0': 70 }, behaviours: {}, initIds: [s.init.id, s.growth.id], growthIds: [] }).expect(200)).body as TeamEvaluationDto;
    expect(draft).toMatchObject({ level: 'direct', sentAt: null, form: { results: { '0': 70 }, initIds: [s.init.id] } }); // the growth item in the init list is dropped
    const bad = await s.direct.post(`${path(s)}/send`).send({ results: { '0': 70 }, behaviours: { 'B2.1': { level: 100, note: 'قصير' } }, initIds: [s.growth.id], growthIds: [] }).expect(422);
    expect(bad.body).toMatchObject({ code: 'TEAM_EVALUATION_INVALID' });
    expect(bad.body.details.problems).toEqual(expect.arrayContaining([{ field: 'results.1', code: 'result_missing' }, { field: 'behaviours.B2.1', code: 'note_short' }, { field: 'behaviours.B2.2', code: 'level_missing' }, { field: 'initIds', code: 'wrong_kind' }]));
    await s.direct.put(path(s)).send({ results: { '0': 101 }, behaviours: {}, initIds: [], growthIds: [] }).expect(400); // a score above 100 never reaches the rules
  });

  it('sends a complete form: the score and the level are computed on the server, the audit is written, and the upper manager is told once', async () => {
    const s = await setup();
    await s.open();
    await s.stageTo('mgr');
    const form = await s.complete();
    const sent = (await s.direct.post(`${path(s)}/send`).send(form).expect(200)).body as TeamEvaluationDto;
    const expected = scoreOf({ template: sent.template, results: sent.template.criteria.map((_, i) => form.results[String(i)]), behaviours: Object.fromEntries(Object.keys(form.behaviours).map((c) => [c, 75])) as never, learning: sent.learning, picks: { init: 4, growth: 2 }, caps: sent.catalogCaps });
    expect(sent.score).toEqual(expected);
    expect(sent.score!.final).toBeGreaterThan(0);
    expect(sent.levelName).toEqual(expect.any(String));
    expect(sent.sentAt).not.toBeNull();
    await vi.waitFor(async () => expect(await titles(s.upper)).toContain('تقييم بانتظار مراجعتك'));
    await s.direct.put(path(s)).send({ ...form, results: all(form, 90) }).expect(200); // an edit after sending stays complete and tells nobody
    await s.direct.post(`${path(s)}/send`).send(form).expect(200);
    expect((await titles(s.upper)).filter((x) => x === 'تقييم بانتظار مراجعتك')).toHaveLength(1);
    await vi.waitFor(async () => {
      const actions = ((await t.db.query(`SELECT action FROM audit_logs WHERE entity_type = 'performance_evaluation' ORDER BY created_at`)) as { action: string }[]).map((a) => a.action);
      expect(actions).toEqual(expect.arrayContaining(['performance.team.sent', 'performance.team.edited']));
    });
    const row = ((await s.direct.get('/api/performance/team').expect(200)).body as TeamEvaluationPageDto).items.find((r) => r.employeeId === s.employeeUser.employeeId)!;
    expect(row).toMatchObject({ mine: 'sent', score: sent.score!.final });
  });

  it('lets the upper manager review after the direct one: they see the direct form, write their own copy, and the direct copy stays as it was', async () => {
    const s = await setup();
    await s.open();
    await s.stageTo('mgr');
    const form = await s.complete();
    await s.direct.post(`${path(s)}/send`).send(form).expect(200);
    const start = await s.one(s.upper);
    expect(start).toMatchObject({ level: 'upper', sentAt: null, form, directForm: form, block: null });
    const changed = { ...form, results: all(form, 100) };
    const sent = (await s.upper.post(`${path(s)}/send`).send(changed).expect(200)).body as TeamEvaluationDto;
    expect(sent.form.results).toEqual(changed.results);
    expect((await s.one(s.direct)).form.results).toEqual(form.results);
    const shown = ((await s.direct.get('/api/performance/team').expect(200)).body as TeamEvaluationPageDto).items.find((r) => r.employeeId === s.employeeUser.employeeId)!;
    expect(shown.score).toBe(sent.score!.final); // the list shows the upper manager's score once they sent
  });

  it('stops the employee from changing their self-evaluation once the direct manager started', async () => {
    const s = await setup();
    await s.open();
    const self = { behaviours: {}, achievements: { '0': 'مسودة' }, initIds: [], growthIds: [] };
    await s.employee.put('/api/performance/me/self').send(self).expect(200);
    await s.stageTo('mgr');
    await s.employee.put('/api/performance/me/self').send(self).expect(200); // the manager has not started yet
    await s.direct.put(path(s)).send({ results: {}, behaviours: {}, initIds: [], growthIds: [] }).expect(200);
    expect((await s.employee.put('/api/performance/me/self').send(self).expect(409)).body).toMatchObject({ code: 'SELF_EVALUATION_CLOSED' });
    expect((await s.employee.get('/api/performance/me').expect(200)).body.evaluation.editable).toBe(false);
  });

  it('lets someone in scope evaluate an employee who has no direct manager (nobody above them to wait for)', async () => {
    const s = await setup();
    await s.open();
    await s.stageTo('mgr');
    await t.db.query('UPDATE employees SET manager_id = NULL WHERE id = $1', [s.employeeUser.employeeId]);
    const form = await s.complete();
    const sent = (await s.upper.post(`${path(s)}/send`).send(form).expect(200)).body as TeamEvaluationDto;
    expect(sent).toMatchObject({ level: 'direct', block: null });
  });

  it('answers 403 without the keys and 404 for a person outside the scope or without an evaluation', async () => {
    const s = await setup();
    await s.open();
    await s.stageTo('mgr');
    await s.employee.get('/api/performance/team').expect(403);
    await s.employee.get(path(s)).expect(403);
    const viewOnly = await t.factories.signIn(await s.person(s.lead, s.group, grants([CorePermission.PerformanceTeamView])));
    await viewOnly.put(path(s)).send({ results: {}, behaviours: {}, initIds: [], growthIds: [] }).expect(403);
    const outside = await t.factories.signIn(await t.factories.user({ grants: grants(TEAM, 'unit') }));
    await outside.get(path(s)).expect(404);
    await outside.put(path(s)).send({ results: {}, behaviours: {}, initIds: [], growthIds: [] }).expect(404);
    await s.direct.get('/api/performance/team/33333333-3333-4333-8333-333333333333').expect(404);
    await s.direct.get('/api/performance/team/not-an-id').expect(400);
  });
});
