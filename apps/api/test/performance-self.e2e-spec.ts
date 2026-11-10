import { type CatalogItemDto, type MyEvaluationDto, type SaveSelfEvaluationInput } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { evaluationScenario } from './helpers/performance-keys';
import { useTestApp } from './setup/test-app';


describe('The self-evaluation (FR-119)', () => {
  const t = useTestApp();

  /** A department with an employee (Rep, grade 7 P: the specialization stage) under a manager, and HR holding the cycle keys with the evaluation file saved. */
  async function setup() {
    const { hr, ...s } = await evaluationScenario(t);
    const manager = await t.factories.user();
    const holder = await s.person(s.rep, s.group);
    await t.db.query('UPDATE employees SET manager_id = $1 WHERE id = $2', [manager.employeeId, holder.employeeId]);
    const me = await t.factories.signIn(holder);
    const boss = await t.factories.signIn(manager);
    const init = (await hr.post('/api/performance/cycle/catalog').send({ kind: 'init', title: 'قيادة مبادرة تحسين', points: 4 }).expect(201)).body as CatalogItemDto;
    const growth = (await hr.post('/api/performance/cycle/catalog').send({ kind: 'growth', title: 'مساهمة في ورشة', points: 2 }).expect(201)).body as CatalogItemDto;
    const open = () => hr.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    const mine = async (agent = me) => (await agent.get('/api/performance/me').expect(200)).body as MyEvaluationDto;
    const complete = (over: Partial<SaveSelfEvaluationInput> = {}): SaveSelfEvaluationInput => ({
      behaviours: { 'B2.1': { level: 75, note: '' }, 'B2.2': { level: 50, note: '' }, 'B2.3': { level: 100, note: 'التزمت بكل المواعيد' }, 'B2.4': { level: 0, note: 'لم أطبق التوجيه هذه السنة' } },
      achievements: { '0': 'أنجزت المهام في موعدها' }, initIds: [init.id], growthIds: [growth.id], ...over,
    });
    return { ...s, hr, manager, holder, me, boss, init, growth, open, mine, complete };
  }

  const titles = async (agent: Awaited<ReturnType<typeof setup>>['me']): Promise<string[]> => ((await agent.get('/api/notifications').expect(200)).body.items as { titleAr: string }[]).map((n) => n.titleAr);

  it('has nothing to show before a cycle is opened', async () => {
    const s = await setup();
    expect(await s.mine()).toEqual({ cycle: null, evaluation: null });
  });

  it('opens an evaluation for each employee with a title: the template of their stage, an empty form, the learning card, and the employee is told', async () => {
    const s = await setup();
    await s.open();
    const m = await s.mine();
    expect(m.cycle).toMatchObject({ fiscalYear: 2026, stage: 'self', selfDeadline: '2027-03-10' });
    expect(m.evaluation).toMatchObject({ stage: 2, stageName: 'التخصص', editable: true, managerName: expect.any(String), learning: { approvedMinutes: 0, stageMinutes: 48 * 60 } });
    expect(m.evaluation!.template.behaviours.map((b) => b.code)).toEqual(['B2.1', 'B2.2', 'B2.3', 'B2.4']);
    expect(m.evaluation!.self).toEqual({ behaviours: {}, achievements: {}, initIds: [], growthIds: [], sentAt: null });
    expect(m.evaluation!.catalog.map((c) => c.id).sort()).toEqual([s.init.id, s.growth.id].sort());
    await vi.waitFor(async () => expect(await titles(s.me)).toContain('فُتحت دورة تقييم الأداء'));
    const noTitle = await t.factories.signIn(await t.factories.user());
    expect(await s.mine(noTitle)).toMatchObject({ cycle: { stage: 'self' }, evaluation: null });
  });

  it('makes the evaluation of someone who joined after the cycle opened when they first ask', async () => {
    const s = await setup();
    await s.open();
    const late = await t.factories.signIn(await s.person(s.rep, s.group));
    expect((await s.mine(late)).evaluation).toMatchObject({ stage: 2, editable: true });
    expect(((await t.db.query('SELECT count(*)::int AS n FROM performance_evaluations')) as { n: number }[])[0]!.n).toBe(2);
  });

  it('keeps a half-filled form as a draft, takes out catalog items that are not there, and shows no score', async () => {
    const s = await setup();
    await s.open();
    const saved = (await s.me.put('/api/performance/me/self').send({ behaviours: { 'B2.1': { level: 75, note: '' } }, achievements: { '0': 'مسودة' }, initIds: [s.init.id, s.growth.id, '33333333-3333-4333-8333-333333333333'], growthIds: [] }).expect(200)).body as MyEvaluationDto;
    expect(saved.evaluation!.self).toMatchObject({ behaviours: { 'B2.1': { level: 75 } }, achievements: { '0': 'مسودة' }, initIds: [s.init.id], sentAt: null });
    expect(JSON.stringify(saved)).not.toMatch(/"(score|final|finalScore|result)"/);
  });

  it('refuses to send an incomplete form (422 with each field and its problem) and sends a complete one', async () => {
    const s = await setup();
    await s.open();
    const bad = await s.me.post('/api/performance/me/self/send').send({ behaviours: { 'B2.1': { level: 100, note: 'قصير' }, 'B2.2': { note: '' } }, achievements: {}, initIds: [s.growth.id], growthIds: [] }).expect(422);
    expect(bad.body).toMatchObject({ code: 'SELF_EVALUATION_INVALID' });
    expect(bad.body.details.problems).toEqual(expect.arrayContaining([{ field: 'behaviours.B2.1', code: 'note_short' }, { field: 'behaviours.B2.2', code: 'level_missing' }, { field: 'behaviours.B2.3', code: 'level_missing' }, { field: 'initIds', code: 'wrong_kind' }]));
    expect((await s.mine()).evaluation!.self.sentAt).toBeNull();
    const sent = (await s.me.post('/api/performance/me/self/send').send(s.complete()).expect(200)).body as MyEvaluationDto;
    expect(sent.evaluation!.self.sentAt).not.toBeNull();
    expect(sent.evaluation!.self.behaviours['B2.3']).toEqual({ level: 100, note: 'التزمت بكل المواعيد' });
  });

  it('tells the direct manager once, on the first send; a later send is an edit that stays complete and tells nobody', async () => {
    const s = await setup();
    await s.open();
    await s.me.post('/api/performance/me/self/send').send(s.complete()).expect(200);
    await vi.waitFor(async () => expect(await titles(s.boss)).toContain('تقييم ذاتي بانتظار مراجعتك'));
    const first = (await s.me.get('/api/performance/me').expect(200)).body.evaluation.self.sentAt as string;
    await s.me.put('/api/performance/me/self').send(s.complete({ achievements: { '0': 'تعديل' } })).expect(200);
    await s.me.put('/api/performance/me/self').send(s.complete({ behaviours: { 'B2.1': { level: 75, note: '' } } })).expect(422); // after sending it stays complete
    await s.me.post('/api/performance/me/self/send').send(s.complete()).expect(200);
    const after = await s.mine();
    expect(after.evaluation!.self.sentAt).toBe(first);
    expect((await titles(s.boss)).filter((x) => x === 'تقييم ذاتي بانتظار مراجعتك')).toHaveLength(1);
    await vi.waitFor(async () => {
      const actions = ((await t.db.query(`SELECT action FROM audit_logs WHERE entity_type = 'performance_evaluation' ORDER BY created_at`)) as { action: string }[]).map((a) => a.action);
      expect(actions[0]).toBe('performance.self.sent');
      expect(actions).toContain('performance.self.edited');
    });
  });

  it('can be changed in the self stage and in the manager stage, and not after that (409)', async () => {
    const s = await setup();
    await s.open();
    await s.me.post('/api/performance/me/self/send').send(s.complete()).expect(200);
    await s.hr.post('/api/performance/cycle/advance').expect(200); // mgr
    expect((await s.mine()).evaluation!.editable).toBe(true);
    await s.me.put('/api/performance/me/self').send(s.complete()).expect(200);
    await s.hr.post('/api/performance/cycle/advance').expect(200); // cal
    expect((await s.mine()).evaluation!.editable).toBe(false);
    expect((await s.me.put('/api/performance/me/self').send(s.complete()).expect(409)).body).toMatchObject({ code: 'SELF_EVALUATION_CLOSED' });
    await s.me.post('/api/performance/me/self/send').send(s.complete()).expect(409);
    expect((await s.mine()).evaluation!.self.sentAt).not.toBeNull(); // still readable
  });

  it('keeps each employee\'s form to themselves', async () => {
    const s = await setup();
    await s.open();
    const other = await t.factories.signIn(await s.person(s.rep, s.group));
    await s.me.put('/api/performance/me/self').send({ behaviours: {}, achievements: { '0': 'خاص بي' }, initIds: [], growthIds: [] }).expect(200);
    expect((await s.mine(other)).evaluation!.self.achievements).toEqual({});
  });

  it('validates the body (400) and the person with no title has no form to save (404)', async () => {
    const s = await setup();
    await s.open();
    const put = (body: object) => s.me.put('/api/performance/me/self').send(body);
    await put({ behaviours: { 'B2.1': { level: 33, note: '' } }, achievements: {}, initIds: [], growthIds: [] }).expect(400);
    await put({ behaviours: {}, achievements: {}, initIds: ['x'], growthIds: [] }).expect(400);
    await put({ behaviours: {}, achievements: {}, initIds: [], growthIds: [], extra: 1 }).expect(400);
    await put({ behaviours: { 'B2.1': { level: 75, note: 'x'.repeat(501) } }, achievements: {}, initIds: [], growthIds: [] }).expect(400);
    const noTitle = await t.factories.signIn(await t.factories.user());
    await noTitle.put('/api/performance/me/self').send({ behaviours: {}, achievements: {}, initIds: [], growthIds: [] }).expect(404);
  });

  it('is closed to people without the key (403)', async () => {
    const s = await setup();
    await s.open();
    const without = await t.factories.signIn(await t.factories.user({ without: ['performance.'] }));
    await without.get('/api/performance/me').expect(403);
    await without.put('/api/performance/me/self').send({ behaviours: {}, achievements: {}, initIds: [], growthIds: [] }).expect(403);
    await without.post('/api/performance/me/self/send').send({ behaviours: {}, achievements: {}, initIds: [], growthIds: [] }).expect(403);
  });

  it('shows the bar «the cycle is open» (plan §15.2): nothing without a cycle, the self-evaluation with its deadline while it is unsent, nothing once it is sent', async () => {
    const s = await setup();
    const notices = async (agent = s.me) => (await agent.get('/api/performance/me/notices').expect(200)).body as { items: { kind: string; path: string; due: { from: string; to: string | null } | null }[] };
    expect((await notices()).items).toEqual([]);
    await s.open();
    expect((await notices()).items).toEqual([{ kind: 'self', path: '/career-profile', due: { from: '2027-03-10', to: null } }]);
    expect((await notices(await t.factories.signIn(await t.factories.user()))).items).toEqual([]);
    await s.me.post('/api/performance/me/self/send').send(s.complete()).expect(200);
    expect((await notices()).items).toEqual([]);
  });
});
