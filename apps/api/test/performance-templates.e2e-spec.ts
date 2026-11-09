import { CorePermission, type EvalFileResult, type PermissionGrant, type TemplatesDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_EVAL_FILE } from '../src/modules/performance/domain/rules/fixtures/eval-file.sample';
import { useTestApp } from './setup/test-app';

const grants = (keys: string[]): PermissionGrant[] => keys.map((key) => ({ key, scope: 'all' as const }));
const HR = [CorePermission.PerformanceCycleView, CorePermission.PerformanceTemplateUpload];

describe('The evaluation file and the stage templates (FR-118)', () => {
  const t = useTestApp();
  const hr = async () => t.factories.signIn(await t.factories.user({ grants: grants(HR) }));

  it('reports what the file holds without saving it by default (dry run)', async () => {
    const agent = await hr();
    const res = (await agent.post('/api/performance/templates/file').send({ text: SAMPLE_EVAL_FILE }).expect(200)).body as EvalFileResult;
    expect(res.saved).toBe(false);
    expect(res.stages).toHaveLength(1);
    expect(res.stages[0]).toMatchObject({ stage: 1, name: 'التأسيس', problems: [] });
    expect(res.scale?.bands).toHaveLength(5);
    expect(res.fiscal?.card.months).toHaveLength(12);
    const kept = (await agent.get('/api/performance/templates').expect(200)).body as TemplatesDto;
    expect(kept).toEqual({ stages: [], scale: null, fiscal: null });
  });

  it('saves a sound file: the stage, the grade scale and the fiscal card are kept, and an upload of the stage again replaces it and counts the version', async () => {
    const agent = await hr();
    const res = (await agent.post('/api/performance/templates/file').send({ text: SAMPLE_EVAL_FILE, dryRun: false }).expect(200)).body as EvalFileResult;
    expect(res.saved).toBe(true);
    const kept = (await agent.get('/api/performance/templates').expect(200)).body as TemplatesDto;
    expect(kept.stages).toHaveLength(1);
    expect(kept.stages[0]).toMatchObject({ stage: 1, resultsWeight: 60, behaviourWeight: 40, cap: 125 });
    expect(kept.scale?.map((b) => b.name)).toEqual(['استثنائي', 'يفوق التوقعات', 'يحقق التوقعات', 'يحتاج تحسينا', 'دون التوقعات']);
    expect(kept.fiscal?.months).toHaveLength(12);
    await agent.post('/api/performance/templates/file').send({ text: SAMPLE_EVAL_FILE, dryRun: false }).expect(200);
    const rows = (await t.db.query('SELECT stage_no, source_version FROM performance_templates')) as { stage_no: number; source_version: number }[];
    expect(rows).toEqual([{ stage_no: 1, source_version: 2 }]);
  });

  it('refuses a file with a part that failed a check (422) and saves nothing of it, naming the problem', async () => {
    const agent = await hr();
    const bad = SAMPLE_EVAL_FILE.replace('المجموع\n125%', 'المجموع\n120%');
    const dry = (await agent.post('/api/performance/templates/file').send({ text: bad }).expect(200)).body as EvalFileResult;
    expect(dry.stages[0]!.problems).toContain('cap_sum');
    const refused = await agent.post('/api/performance/templates/file').send({ text: bad, dryRun: false }).expect(422);
    expect(refused.body).toMatchObject({ code: 'EVAL_FILE_NEEDS_REVIEW' });
    expect(refused.body.details.problems).toContain('stage1:cap_sum');
    expect((await t.db.query('SELECT count(*)::int AS n FROM performance_templates'))[0]).toEqual({ n: 0 });
    await agent.post('/api/performance/templates/file').send({ text: 'لا شيء', dryRun: false }).expect(422);
  });

  it('validates the body: an empty text, a too long text and unknown fields are 400', async () => {
    const agent = await hr();
    await agent.post('/api/performance/templates/file').send({ text: '' }).expect(400);
    await agent.post('/api/performance/templates/file').send({ text: 'x'.repeat(200_001) }).expect(400);
    await agent.post('/api/performance/templates/file').send({ text: 'x', extra: 1 }).expect(400);
  });

  it('403 without the key of each route, and the audit trail records an upload', async () => {
    const viewer = await t.factories.signIn(await t.factories.user({ grants: grants([CorePermission.PerformanceCycleView]) }));
    await viewer.post('/api/performance/templates/file').send({ text: SAMPLE_EVAL_FILE }).expect(403);
    const nobody = await t.factories.signIn(await t.factories.user());
    await nobody.get('/api/performance/templates').expect(403);
    const agent = await hr();
    await agent.post('/api/performance/templates/file').send({ text: SAMPLE_EVAL_FILE, dryRun: false }).expect(200);
    await vi.waitFor(async () => {
      const actions = ((await t.db.query(`SELECT action FROM audit_logs WHERE entity_type = 'performance_template'`)) as { action: string }[]).map((a) => a.action);
      expect(actions).toContain('performance.template.saved');
    });
  });
});
