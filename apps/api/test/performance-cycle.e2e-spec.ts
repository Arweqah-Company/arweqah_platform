import { CorePermission, type CatalogItemDto, type CycleStateDto, type PermissionGrant } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_EVAL_FILE } from '../src/modules/performance/domain/rules/fixtures/eval-file.sample';
import { FULL_EVAL_FILE as FULL } from './helpers/eval-file';
import { useTestApp } from './setup/test-app';

const grants = (keys: string[]): PermissionGrant[] => keys.map((key) => ({ key, scope: 'all' as const }));
const ALL = [CorePermission.PerformanceCycleView, CorePermission.PerformanceTemplateUpload, CorePermission.PerformanceCycleManage, CorePermission.PerformanceCycleClose, CorePermission.PerformanceCatalogManage];
describe('The evaluation cycle (FR-118)', () => {
  const t = useTestApp();
  const hr = async (keys: string[] = ALL) => t.factories.signIn(await t.factories.user({ grants: grants(keys) }));
  const withFile = async () => {
    const agent = await hr();
    await agent.post('/api/performance/templates/file').send({ text: FULL, dryRun: false }).expect(200);
    return agent;
  };
  const state = async (agent: Awaited<ReturnType<typeof hr>>) => (await agent.get('/api/performance/cycle').expect(200)).body as CycleStateDto;

  it('says what is missing before the cycle can open, and refuses to open an incomplete one (422 with the checklist)', async () => {
    const agent = await hr();
    const s = await state(agent);
    expect(s.cycle).toBeNull();
    expect(s.readiness).toMatchObject({ ready: false, scale: false, fiscal: false });
    expect(s.readiness.stages.every((x) => !x.ready)).toBe(true);
    const refused = await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(422);
    expect(refused.body).toMatchObject({ code: 'CYCLE_NOT_READY' });
    await agent.post('/api/performance/templates/file').send({ text: SAMPLE_EVAL_FILE, dryRun: false }).expect(200);
    expect((await state(agent)).readiness).toMatchObject({ ready: false, scale: true, fiscal: true });
  });

  it('opens a cycle with a snapshot of the templates; a later change of the templates does not change it', async () => {
    const agent = await withFile();
    const opened = (await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200)).body as CycleStateDto;
    expect(opened.cycle).toMatchObject({ fiscalYear: 2026, stage: 'self', closedAt: null });
    expect(opened).toMatchObject({ datesFor: 'cycle', dates: expect.any(Array) });
    expect(opened.dates).toHaveLength(7);
    const [row] = (await t.db.query('SELECT template_snapshot FROM performance_cycles')) as { template_snapshot: { stages: { stage: number; cap: number }[]; scale: unknown[] } }[];
    expect(row!.template_snapshot.stages.map((s) => s.stage)).toEqual([1, 2, 3, 4, 5]);
    expect(row!.template_snapshot.scale).toHaveLength(5);
    const changed = FULL.replace(/تعلم\n10%/g, 'تعلم\n12%').replace(/المجموع\n125%/g, 'المجموع\n127%');
    await agent.post('/api/performance/templates/file').send({ text: changed, dryRun: false }).expect(200);
    expect(((await t.db.query('SELECT (template::jsonb)->>\'cap\' AS cap FROM performance_templates WHERE stage_no = 1')) as { cap: string }[])[0]!.cap).toBe('127');
    const [after] = (await t.db.query('SELECT template_snapshot FROM performance_cycles')) as { template_snapshot: unknown }[];
    expect(after!.template_snapshot).toEqual(row!.template_snapshot);
  });

  it('refuses a second cycle while one is open (409) and a year that already has one (409)', async () => {
    const agent = await withFile();
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    expect((await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2027 }).expect(409)).body).toMatchObject({ code: 'CYCLE_ALREADY_OPEN' });
    await agent.post('/api/performance/cycle/close').expect(200);
    expect((await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(409)).body).toMatchObject({ code: 'CYCLE_YEAR_EXISTS' });
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2027 }).expect(200);
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 1999 }).expect(400);
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2030, extra: 1 }).expect(400);
  });

  it('moves one stage at a time to the objections, then only closing is left; the closer and the time are kept', async () => {
    const agent = await withFile();
    await agent.post('/api/performance/cycle/advance').expect(409); // none open
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    const stages: string[] = [];
    for (let i = 0; i < 5; i++) stages.push(((await agent.post('/api/performance/cycle/advance').expect(200)).body as CycleStateDto).cycle!.stage);
    expect(stages).toEqual(['mgr', 'cal', 'appr', 'notif', 'obj']);
    expect((await agent.post('/api/performance/cycle/advance').expect(409)).body).toMatchObject({ code: 'CYCLE_AT_LAST_STAGE' });
    const closed = (await agent.post('/api/performance/cycle/close').expect(200)).body as CycleStateDto;
    expect(closed.cycle).toMatchObject({ stage: 'closed' });
    expect(closed.cycle!.closedAt).not.toBeNull();
    await agent.post('/api/performance/cycle/close').expect(409);
    await agent.post('/api/performance/cycle/advance').expect(409);
    const [row] = (await t.db.query('SELECT closed_by FROM performance_cycles')) as { closed_by: string }[];
    expect(row!.closed_by).toBeTruthy();
  });

  it('lets only one of two opens at the same moment through (one open cycle in the database)', async () => {
    const agent = await withFile();
    const both = await Promise.all([agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }), agent.post('/api/performance/cycle/open').send({ fiscalYear: 2027 })]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(((await t.db.query(`SELECT count(*)::int AS n FROM performance_cycles WHERE status <> 'closed'`)) as { n: number }[])[0]!.n).toBe(1);
  });

  it('keeps one open cycle in the database itself: a second row that is not closed is refused, a closed one is not', async () => {
    const insert = (year: number, status: string) => t.db.query(`INSERT INTO performance_cycles (fiscal_year, status, is_open, opened_by, opened_at, template_snapshot) VALUES ($1, $2::varchar, $2::varchar <> 'closed', gen_random_uuid(), now(), '{}')`, [year, status]);
    await insert(2030, 'self');
    await expect(insert(2031, 'mgr')).rejects.toThrow(/unique|duplicate/i);
    await insert(2032, 'closed');
    await insert(2033, 'closed');
  });

  it('moves a stage once when two advances arrive together: the row and the workflow agree, and the other is 409', async () => {
    const agent = await withFile();
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    const both = await Promise.all([agent.post('/api/performance/cycle/advance'), agent.post('/api/performance/cycle/advance')]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 409]);
    const [row] = (await t.db.query(`SELECT c.status AS stage, w.state FROM performance_cycles c JOIN workflow_instances w ON w.entity_id = c.id`)) as { stage: string; state: string }[];
    expect(row).toEqual({ stage: 'mgr', state: 'mgr' });
  });

  it('sets the dates of the stages and refuses one that does not fit the others (422 with the problems)', async () => {
    const agent = await withFile();
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    await agent.put('/api/performance/cycle/dates/final').send({ from: '2027-04-15', to: '2027-04-20' }).expect(200);
    const s = (await agent.put('/api/performance/cycle/dates/calibration').send({ from: '2027-04-21', to: '2027-04-24' }).expect(200)).body as CycleStateDto;
    expect(s.dates.map((d) => d.key)).toEqual(['final', 'calibration', 'approval', 'notification', 'objection', 'self_deadline', 'qualitative_close']);
    const bad = await agent.put('/api/performance/cycle/dates/calibration').send({ from: '2027-04-10', to: '2027-04-24' }).expect(422);
    expect(bad.body).toMatchObject({ code: 'CYCLE_DATE_INVALID' });
    expect(bad.body.details.problems).toContain('before_previous');
    await agent.put('/api/performance/cycle/dates/final').send({ from: '2027-04-22', to: '2027-04-20' }).expect(422);
    await agent.put('/api/performance/cycle/dates/zzz').send({ from: '2027-04-22' }).expect(400);
    await agent.put('/api/performance/cycle/dates/final').send({ from: 'tomorrow' }).expect(400);
    await agent.put('/api/performance/cycle/dates/approval').send({ from: '2027-04-27' }).expect(200);
    await vi.waitFor(async () => expect(((await t.db.query(`SELECT count(*)::int AS n FROM audit_logs WHERE action = 'performance.cycle.date_set'`)) as { n: number }[])[0]!.n).toBeGreaterThanOrEqual(3));
  });

  it('keeps a catalog: items wait for the next cycle, the open cycle takes them, and an item is added, listed and removed', async () => {
    const agent = await withFile();
    const item = (await agent.post('/api/performance/cycle/catalog').send({ kind: 'init', title: 'قيادة مبادرة تحسين', points: 4 }).expect(201)).body as CatalogItemDto;
    expect(item).toMatchObject({ kind: 'init', title: 'قيادة مبادرة تحسين', points: 4 });
    expect((await state(agent)).catalog).toHaveLength(1);
    expect((await state(agent)).readiness.catalogItems).toBe(1);
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    const s = await state(agent);
    expect(s.catalog.map((c) => c.id)).toEqual([item.id]);
    await agent.post('/api/performance/cycle/catalog').send({ kind: 'growth', title: 'مساهمة في ورشة', points: 2 }).expect(201);
    expect((await state(agent)).catalog).toHaveLength(2);
    await agent.delete(`/api/performance/cycle/catalog/${item.id}`).expect(204);
    await agent.delete(`/api/performance/cycle/catalog/${item.id}`).expect(404);
    expect((await state(agent)).catalog).toHaveLength(1);
  });

  it('validates a catalog item: the title (three characters), the points (1 to 10), the kind, unknown fields', async () => {
    const agent = await hr();
    const post = (body: object) => agent.post('/api/performance/cycle/catalog').send(body);
    await post({ kind: 'init', title: 'ab', points: 3 }).expect(400);
    await post({ kind: 'init', title: 'عنوان', points: 0 }).expect(400);
    await post({ kind: 'init', title: 'عنوان', points: 11 }).expect(400);
    await post({ kind: 'zzz', title: 'عنوان', points: 3 }).expect(400);
    await post({ kind: 'init', title: 'عنوان', points: 3, extra: 1 }).expect(400);
  });

  it('403 without the key of each route (view, manage, close, catalog, upload)', async () => {
    const withFileAgent = await withFile();
    await withFileAgent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    const only = async (key: string) => hr([key]);
    const viewer = await only(CorePermission.PerformanceCycleView);
    await viewer.get('/api/performance/cycle').expect(200);
    await viewer.post('/api/performance/cycle/advance').expect(403);
    await viewer.post('/api/performance/cycle/close').expect(403);
    await viewer.put('/api/performance/cycle/dates/final').send({ from: '2027-04-15' }).expect(403);
    await viewer.post('/api/performance/cycle/reminders').send({ kind: 'mgr', on: true, days: [2], titleAr: 'تذكير للمدير', titleEn: '', bodyAr: 'تقييم ينتظر مراجعتك', bodyEn: '' }).expect(403);
    await viewer.post('/api/performance/cycle/catalog').send({ kind: 'init', title: 'عنوان', points: 3 }).expect(403);
    await viewer.post('/api/performance/cycle/open').send({ fiscalYear: 2030 }).expect(403);
    const manager = await only(CorePermission.PerformanceCycleManage);
    await manager.get('/api/performance/cycle').expect(403);
    await manager.post('/api/performance/cycle/close').expect(403);
    const nobody = await t.factories.signIn(await t.factories.user());
    await nobody.get('/api/performance/cycle').expect(403);
  });
});
