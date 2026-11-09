import { CorePermission, type CycleStateDto, type PermissionGrant, type TemplatesDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { FULL_EVAL_FILE } from './helpers/eval-file';
import { useTestApp } from './setup/test-app';

const grants = (keys: string[]): PermissionGrant[] => keys.map((key) => ({ key, scope: 'all' as const }));
const EDIT = [CorePermission.PerformanceCycleView, CorePermission.PerformanceTemplateUpload, CorePermission.PerformanceTemplateEdit, CorePermission.PerformanceCycleManage, CorePermission.PerformanceCycleClose];

/** A sound stage as the form sends it: the basic total (100) and the cap (125) are not in it. */
const STAGE = {
  name: 'التأسيس', resultsWeight: 60, behaviourWeight: 40,
  extra: [{ name: 'تعلم', points: 10 }, { name: 'مبادرات داخلية', points: 10 }, { name: 'مساهمة في النمو', points: 5 }],
  ruleText: 'يقيّم المدير المباشر', resultsNote: 'ما تعنيه النتائج في هذه المرحلة',
  criteria: [{ name: 'جودة العمل', share: 60 }, { name: 'الالتزام بالمواعيد', share: 40 }],
  behaviours: [{ code: 'B1.1', name: 'التعاون', question: 'هل يتعاون مع زملائه؟' }, { code: 'B1.2', name: 'المبادرة', question: 'هل يبادر بالحلول؟' }],
};
/** The five bands, the highest first: the top one open above, the bottom one open below. */
const BANDS = [
  { name: 'استثنائي', from: 110, to: null, description: 'يتجاوز المتوقع بوضوح' },
  { name: 'يفوق التوقعات', from: 95, to: 109.9, description: 'أداء أعلى من المتوقع' },
  { name: 'يحقق التوقعات', from: 80, to: 94.9, description: 'أداء كما هو متوقع' },
  { name: 'يحتاج تحسينًا', from: 65, to: 79.9, description: 'أقل من المتوقع' },
  { name: 'دون التوقعات', from: null, to: 65, description: 'دون المتوقع' },
];
const MONTHS = ['أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر', 'يناير', 'فبراير', 'مارس'];
const CARD = { months: MONTHS.map((month, i) => ({ month, kind: i % 3 === 0 ? 'محطة' : 'متابعة يومية' })), notes: [{ month: 'يوليو', text: 'المراجعة القصيرة الأولى' }] };

describe('Editing the evaluation file from the cycle page (FR-118, plan §3.7ج)', () => {
  const t = useTestApp();
  const hr = async (keys: string[] = EDIT) => t.factories.signIn(await t.factories.user({ grants: grants(keys) }));
  type Agent = Awaited<ReturnType<typeof hr>>;
  const withFile = async () => {
    const agent = await hr();
    await agent.post('/api/performance/templates/file').send({ text: FULL_EVAL_FILE, dryRun: false }).expect(200);
    return agent;
  };
  const stages = (agent: Agent) => agent.put('/api/performance/templates/stages/1');
  const templates = async (agent: Agent) => (await agent.get('/api/performance/templates').expect(200)).body as TemplatesDto;
  const readiness = async (agent: Agent) => ((await agent.get('/api/performance/cycle').expect(200)).body as CycleStateDto).readiness;
  const audited = async (action: string) => ((await t.db.query(`SELECT count(*)::int AS n FROM audit_logs WHERE action = $1`, [action])) as { n: number }[])[0]!.n;

  it('adds the template of a stage that was missing, with the basic total and the cap computed from the form', async () => {
    const agent = await hr();
    const saved = (await stages(agent).send(STAGE).expect(200)).body as TemplatesDto;
    expect(saved.stages).toHaveLength(1);
    expect(saved.stages[0]).toMatchObject({ stage: 1, name: 'التأسيس', resultsWeight: 60, behaviourWeight: 40, basicTotal: 100, cap: 125 });
    expect(saved.stages[0]!.behaviours.map((b) => b.code)).toEqual(['B1.1', 'B1.2']);
    expect((await readiness(agent)).stages.find((s) => s.stage === 1)!.ready).toBe(true);
    expect(((await t.db.query('SELECT source_version FROM performance_templates WHERE stage_no = 1')) as { source_version: number }[])[0]!.source_version).toBe(1);
    await vi.waitFor(async () => expect(await audited('performance.template.stage_saved')).toBe(1));
  });

  it('changes a stage from the file: the weights, the extra components and the criteria; the version grows and the cap follows', async () => {
    const agent = await withFile();
    const before = (await templates(agent)).stages.find((s) => s.stage === 2)!;
    expect(before.cap).toBe(125);
    const changed = { ...STAGE, name: 'التخصص', resultsWeight: 50, behaviourWeight: 50, extra: [{ name: 'تعلم', points: 10 }], behaviours: [{ code: 'B2.1', name: 'التعاون', question: 'هل يتعاون؟' }] };
    const saved = (await agent.put('/api/performance/templates/stages/2').send(changed).expect(200)).body as TemplatesDto;
    expect(saved.stages.find((s) => s.stage === 2)).toMatchObject({ resultsWeight: 50, behaviourWeight: 50, basicTotal: 100, cap: 110 });
    expect(saved.stages).toHaveLength(5);
    expect(((await t.db.query('SELECT source_version FROM performance_templates WHERE stage_no = 2')) as { source_version: number }[])[0]!.source_version).toBe(2);
  });

  it('refuses a stage that fails a check (422 TEMPLATE_NEEDS_REVIEW with the codes) and saves nothing', async () => {
    const agent = await hr();
    const refuse = async (body: object, code: string) => {
      const res = await stages(agent).send(body).expect(422);
      expect(res.body).toMatchObject({ code: 'TEMPLATE_NEEDS_REVIEW' });
      expect(res.body.details.problems).toContain(code);
    };
    await refuse({ ...STAGE, criteria: [{ name: 'جودة', share: 60 }, { name: 'التزام', share: 30 }] }, 'criteria_sum');
    await refuse({ ...STAGE, criteria: [] }, 'no_criteria');
    await refuse({ ...STAGE, behaviours: [] }, 'no_behaviours');
    await refuse({ ...STAGE, behaviours: [{ code: 'B1.1', name: 'التعاون', question: '   ' }] }, 'behaviour_question');
    await refuse({ ...STAGE, behaviours: [{ code: 'B1.1', name: 'أ', question: 'س' }, { code: 'B1.1', name: 'ب', question: 'س' }] }, 'behaviour_code');
    await refuse({ ...STAGE, behaviours: [{ code: 'سلوك1', name: 'أ', question: 'س' }] }, 'behaviour_code');
    expect((await templates(agent)).stages).toEqual([]);
  });

  it('validates the form and the stage number: 400 for a stage outside 1 to 5, a weight out of range, an empty name, unknown fields', async () => {
    const agent = await hr();
    await agent.put('/api/performance/templates/stages/6').send(STAGE).expect(400);
    await agent.put('/api/performance/templates/stages/0').send(STAGE).expect(400);
    await agent.put('/api/performance/templates/stages/x').send(STAGE).expect(400);
    await stages(agent).send({ ...STAGE, resultsWeight: 101 }).expect(400);
    await stages(agent).send({ ...STAGE, name: ' ' }).expect(400);
    await stages(agent).send({ ...STAGE, cap: 125 }).expect(400); // the cap is computed, not typed
    await stages(agent).send({ ...STAGE, criteria: [{ name: 'جودة', share: 100, extra: 1 }] }).expect(400);
    const noName: Record<string, unknown> = { ...STAGE };
    delete noName.name;
    await stages(agent).send(noName).expect(400);
  });

  it('removes the template of a stage: the readiness list says it is not uploaded and a new cycle cannot open; removing it again is 404', async () => {
    const agent = await withFile();
    expect((await readiness(agent)).ready).toBe(true);
    await agent.delete('/api/performance/templates/stages/3').expect(204);
    const after = await readiness(agent);
    expect(after.ready).toBe(false);
    expect(after.stages.find((s) => s.stage === 3)!.ready).toBe(false);
    expect((await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(422)).body).toMatchObject({ code: 'CYCLE_NOT_READY' });
    await agent.delete('/api/performance/templates/stages/3').expect(404);
    await agent.delete('/api/performance/templates/stages/9').expect(400);
    await vi.waitFor(async () => expect(await audited('performance.template.stage_removed')).toBe(1));
    await stages(agent).send(STAGE).expect(200);
    await agent.put('/api/performance/templates/stages/3').send({ ...STAGE, name: 'البراعة', behaviours: [{ code: 'B3.1', name: 'أ', question: 'س' }] }).expect(200);
    expect((await readiness(agent)).ready).toBe(true);
  });

  it('keeps the snapshot of a running cycle: an edit or a removal of a stage does not change it', async () => {
    const agent = await withFile();
    await agent.post('/api/performance/cycle/open').send({ fiscalYear: 2026 }).expect(200);
    const snapshot = async () => ((await t.db.query('SELECT template_snapshot AS s FROM performance_cycles')) as { s: unknown }[])[0]!.s;
    const before = await snapshot();
    await stages(agent).send({ ...STAGE, resultsWeight: 30, behaviourWeight: 70 }).expect(200);
    await agent.put('/api/performance/templates/scale').send({ bands: BANDS.map((b) => ({ ...b, name: `${b.name} معدّل` })) }).expect(200);
    await agent.delete('/api/performance/templates/stages/5').expect(204);
    expect(await snapshot()).toEqual(before);
    expect((await templates(agent)).stages.find((s) => s.stage === 1)).toMatchObject({ resultsWeight: 30, behaviourWeight: 70 });
  });

  it('keeps the five bands of the grade scale: the range of each is written from its numbers', async () => {
    const agent = await hr();
    const saved = (await agent.put('/api/performance/templates/scale').send({ bands: BANDS }).expect(200)).body as TemplatesDto;
    expect(saved.scale!.map((b) => b.range)).toEqual(['110 فأكثر', '95 إلى 109.9', '80 إلى 94.9', '65 إلى 79.9', 'أقل من 65']);
    expect(saved.scale![0]).toMatchObject({ name: 'استثنائي', from: 110, to: null });
    expect(saved.scale![4]).toMatchObject({ name: 'دون التوقعات', from: null, to: 65 });
    expect((await readiness(agent)).scale).toBe(true);
    await vi.waitFor(async () => expect(await audited('performance.template.scale_saved')).toBe(1));
  });

  it('refuses a grade scale with overlapping ranges, wrong open ends or not five levels (422 with the codes); 400 for a malformed band', async () => {
    const agent = await hr();
    const put = (bands: object[]) => agent.put('/api/performance/templates/scale').send({ bands });
    const overlap = BANDS.map((b, i) => (i === 1 ? { ...b, from: 70 } : b));
    expect((await put(overlap).expect(422)).body).toMatchObject({ code: 'TEMPLATE_NEEDS_REVIEW', details: { problems: ['scale_range'] } });
    expect((await put(BANDS.map((b, i) => (i === 0 ? { ...b, to: 120 } : b))).expect(422)).body.details.problems).toEqual(['scale_range']); // the top band has an end
    expect((await put(BANDS.map((b, i) => (i === 4 ? { ...b, from: 0 } : b))).expect(422)).body.details.problems).toEqual(['scale_range']); // the bottom band has a start
    expect((await put(BANDS.map((b, i) => (i === 2 ? { ...b, to: null } : b))).expect(422)).body.details.problems).toEqual(['scale_range']); // a middle band is open
    await put(BANDS.slice(0, 1)).expect(400); // one level is too few
    await put(BANDS.slice(0, 4).map((b, i) => (i === 3 ? { ...b, from: null } : b))).expect(200); // four levels are fine
    await put([...BANDS, BANDS[0]!]).expect(422); // a sixth level on top of a closed range
    await put(BANDS.map((b, i) => (i === 0 ? { ...b, name: '' } : b))).expect(400);
    await put(BANDS.map((b, i) => (i === 0 ? { ...b, range: '110 فأكثر' } : b))).expect(400); // the range is written by the server
    expect((await templates(agent)).scale).toHaveLength(4); // only the four-level scale was kept; every refused one changed nothing
  });

  it('keeps the fiscal-year card: the kind of each of the twelve months and the notes', async () => {
    const agent = await hr();
    const saved = (await agent.put('/api/performance/templates/fiscal-card').send(CARD).expect(200)).body as TemplatesDto;
    expect(saved.fiscal!.months).toHaveLength(12);
    expect(saved.fiscal!.months[0]).toEqual({ month: 'أبريل', kind: 'محطة' });
    expect(saved.fiscal!.notes).toEqual([{ month: 'يوليو', text: 'المراجعة القصيرة الأولى' }]);
    expect((await readiness(agent)).fiscal).toBe(true);
    await vi.waitFor(async () => expect(await audited('performance.template.fiscal_saved')).toBe(1));
  });

  it('refuses a fiscal card that is not the twelve months once each (422 / 400), a kind it does not know, an empty note', async () => {
    const agent = await hr();
    const put = (body: object) => agent.put('/api/performance/templates/fiscal-card').send(body);
    const repeated = { ...CARD, months: CARD.months.map((m, i) => (i === 11 ? { ...m, month: 'أبريل' } : m)) };
    expect((await put(repeated).expect(422)).body).toMatchObject({ code: 'TEMPLATE_NEEDS_REVIEW', details: { problems: ['fiscal_months'] } });
    await put({ ...CARD, months: CARD.months.slice(0, 11) }).expect(400);
    await put({ ...CARD, months: CARD.months.map((m, i) => (i === 0 ? { ...m, kind: 'عطلة' } : m)) }).expect(400);
    await put({ ...CARD, months: CARD.months.map((m, i) => (i === 0 ? { ...m, month: 'شهر' } : m)) }).expect(400);
    await put({ ...CARD, notes: [{ month: 'يوليو', text: '' }] }).expect(400);
    await put({ ...CARD, extra: 1 }).expect(400);
    expect((await templates(agent)).fiscal).toBeNull();
  });

  it('audits the edits without the words of the template', async () => {
    const agent = await hr();
    await stages(agent).send(STAGE).expect(200);
    await agent.put('/api/performance/templates/scale').send({ bands: BANDS }).expect(200);
    await agent.put('/api/performance/templates/fiscal-card').send(CARD).expect(200);
    await vi.waitFor(async () => {
      const rows = (await t.db.query(`SELECT changes::text AS changes FROM audit_logs WHERE action LIKE 'performance.template.%'`)) as { changes: string | null }[];
      expect(rows).toHaveLength(3);
      for (const r of rows) for (const word of ['التعاون', 'استثنائي', 'المراجعة القصيرة']) expect(r.changes ?? '').not.toContain(word);
    });
  });

  it('403 for every edit without performance.template_edit (the upload key and the view key do not open it), and 403 on the page without the view key', async () => {
    const owner = await withFile();
    const viewer = await hr([CorePermission.PerformanceCycleView, CorePermission.PerformanceTemplateUpload, CorePermission.PerformanceCycleManage]);
    await viewer.put('/api/performance/templates/stages/1').send(STAGE).expect(403);
    await viewer.delete('/api/performance/templates/stages/1').expect(403);
    await viewer.put('/api/performance/templates/scale').send({ bands: BANDS }).expect(403);
    await viewer.put('/api/performance/templates/fiscal-card').send(CARD).expect(403);
    await viewer.get('/api/performance/templates').expect(200);
    const nobody = await t.factories.signIn(await t.factories.user());
    await nobody.put('/api/performance/templates/stages/1').send(STAGE).expect(403);
    const editorOnly = await hr([CorePermission.PerformanceTemplateEdit]);
    await editorOnly.put('/api/performance/templates/stages/1').send(STAGE).expect(200);
    await editorOnly.get('/api/performance/templates').expect(403);
    expect((await templates(owner)).stages.find((s) => s.stage === 1)).toMatchObject({ name: 'التأسيس' });
  });
});
