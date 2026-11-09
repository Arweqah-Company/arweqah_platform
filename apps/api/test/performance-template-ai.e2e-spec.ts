import { CorePermission, type EvalFileContent, type EvalFileResult, type PermissionGrant, type TemplatesDto } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { aiAnswerOf } from '../src/modules/performance/domain/rules/fixtures/ai-eval-file.sample';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { FULL_EVAL_FILE } from './helpers/eval-file';
import { useTestApp } from './setup/test-app';

const KEYS = [CorePermission.PerformanceCycleView, CorePermission.PerformanceTemplateUpload, CorePermission.PerformanceTemplateAi];
const AI_ADMIN_KEYS = [CorePermission.IntegrationsAiView, CorePermission.IntegrationsAiEdit, CorePermission.IntegrationsAiTest, CorePermission.IntegrationsAiActivate];
const grants = (without?: string): PermissionGrant[] => KEYS.filter((k) => k !== without).map((key) => ({ key, scope: 'all' as const }));
const AI_VALUES = { apiKey: 'sk-ant-api03-e2e-key-1234567890', model: 'claude-opus-5-5' };

describe('Placing an evaluation file with the AI (FR-118)', () => {
  const t = useTestApp();

  async function switchAiOn() {
    const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...AI_ADMIN_KEYS.map((key) => ({ key, scope: 'all' as const }))] }));
    await admin.post('/api/integrations/ai/anthropic/test').send({ values: AI_VALUES }).expect(200);
    await admin.put('/api/integrations/ai/anthropic').send({ values: AI_VALUES }).expect(200);
    await admin.post('/api/integrations/ai/anthropic/activate').expect(200);
    t.ai.reset();
  }

  async function setup(options: { ai?: boolean; grants?: PermissionGrant[] } = {}) {
    if (options.ai !== false) await switchAiOn();
    const hr = await t.factories.signIn(await t.factories.user({ grants: options.grants ?? grants() }));
    const analyze = (body: unknown = { text: FULL_EVAL_FILE }) => hr.post('/api/performance/templates/file/ai').send(body as object);
    const stored = async () => (await hr.get('/api/performance/templates').expect(200)).body as TemplatesDto;
    return { hr, analyze, stored };
  }

  it('FR-118: analyses a file without saving anything; the reply says what the AI placed and what to check', async () => {
    const s = await setup();
    t.ai.answer(aiAnswerOf(FULL_EVAL_FILE));
    const res = (await s.analyze().expect(200)).body as EvalFileResult;
    expect(res).toMatchObject({ source: 'ai', saved: false, aiAvailable: true, ungrounded: [] });
    expect(res.stages.map((x) => x.stage)).toEqual([1, 2, 3, 4, 5]);
    expect(res.stages.every((x) => x.problems.length === 0)).toBe(true);
    expect(res.scale).toMatchObject({ problems: [] });
    expect(res.scale!.bands[0]!.range).toBe('110 فأكثر');
    expect(res.content!.stages).toHaveLength(5);
    expect((await s.stored()).stages).toHaveLength(0);
    expect(t.ai.calls[0]!.user).toContain('<document>');
  });

  it('FR-118: confirming the reviewed content saves it (the basic total and cap are computed) and the audit says it came from the AI, without any text', async () => {
    const s = await setup();
    t.ai.answer(aiAnswerOf(FULL_EVAL_FILE));
    const content = ((await s.analyze().expect(200)).body as EvalFileResult).content as EvalFileContent;
    const saved = (await s.hr.post('/api/performance/templates/file/confirm').send({ content }).expect(200)).body as EvalFileResult;
    expect(saved).toMatchObject({ saved: true, source: 'ai' });
    const kept = await s.stored();
    expect(kept.stages.map((x) => x.stage)).toEqual([1, 2, 3, 4, 5]);
    expect(kept.stages[0]).toMatchObject({ basicTotal: 100, cap: 125 });
    expect(kept.scale).toHaveLength(5);
    expect(kept.fiscal!.months).toHaveLength(12);
    await vi.waitFor(async () => {
      const rows = (await t.db.query(`SELECT action, changes::text AS changes FROM audit_logs WHERE action IN ('performance.template.file_ai', 'performance.template.saved')`)) as { action: string; changes: string }[];
      expect(rows.map((r) => r.action).sort()).toEqual(['performance.template.file_ai', 'performance.template.saved']);
      expect(rows.find((r) => r.action === 'performance.template.saved')!.changes).toContain('"source": "ai"');
      for (const r of rows) expect(r.changes).not.toContain('معيار');
    });
  });

  it('FR-118: the ordinary dry run now says whether an AI service is on and carries the content it read', async () => {
    const s = await setup();
    const res = (await s.hr.post('/api/performance/templates/file').send({ text: FULL_EVAL_FILE }).expect(200)).body as EvalFileResult;
    expect(res.aiAvailable).toBe(true);
    expect(res.content!.stages).toHaveLength(5);
  });

  it('FR-118: the ordinary dry run says no AI service is on when none is', async () => {
    const s = await setup({ ai: false });
    expect(((await s.hr.post('/api/performance/templates/file').send({ text: FULL_EVAL_FILE }).expect(200)).body as EvalFileResult).aiAvailable).toBe(false);
  });

  it('FR-118: lists the texts the model did not copy, and the checks the reading fails', async () => {
    const s = await setup();
    const answer = aiAnswerOf(FULL_EVAL_FILE);
    answer.stages[0]!.name = 'اسم مخترع للمرحلة';
    answer.stages[0]!.criteria = [{ name: 'معيار وحيد', share: 60 }];
    t.ai.answer(answer);
    const res = (await s.analyze().expect(200)).body as EvalFileResult;
    expect(res.ungrounded).toEqual(expect.arrayContaining(['اسم مخترع للمرحلة', 'معيار وحيد']));
    expect(res.stages[0]!.problems).toContain('criteria_sum');
  });

  it('FR-118: confirm refuses content with a part that fails a check (422 TEMPLATE_NEEDS_REVIEW) and keeps what is stored', async () => {
    const s = await setup();
    t.ai.answer(aiAnswerOf(FULL_EVAL_FILE));
    const content = ((await s.analyze().expect(200)).body as EvalFileResult).content as EvalFileContent;
    const broken = { ...content, stages: content.stages.map((x, i) => (i === 0 ? { ...x, criteria: [{ name: 'معيار', share: 10 }] } : x)) };
    const res = await s.hr.post('/api/performance/templates/file/confirm').send({ content: broken }).expect(422);
    expect(res.body).toMatchObject({ code: 'TEMPLATE_NEEDS_REVIEW', details: { problems: ['stage1:criteria_sum'] } });
    await s.hr.post('/api/performance/templates/file/confirm').send({ content: { stages: [], scale: null, fiscal: null } }).expect(422);
    expect((await s.stored()).stages).toHaveLength(0);
  });

  it('FR-118: validation: empty or too long text, unknown fields, a stage outside 1 to 5 → 400', async () => {
    const s = await setup();
    await s.analyze({ text: '' }).expect(400);
    await s.analyze({ text: 'x'.repeat(200_001) }).expect(400);
    await s.analyze({ text: 'نص', extra: 1 }).expect(400);
    const content = { stages: [{ stage: 6, name: 'x', resultsWeight: 1, behaviourWeight: 1, extra: [], ruleText: '', resultsNote: '', criteria: [], behaviours: [] }], scale: null, fiscal: null };
    await s.hr.post('/api/performance/templates/file/confirm').send({ content }).expect(400);
    await s.hr.post('/api/performance/templates/file/confirm').send({}).expect(400);
    expect(t.ai.calls).toHaveLength(0);
  });

  it('FR-118: 403 without performance.template_ai to analyse and without performance.template_upload to confirm; the model is not called', async () => {
    const noAi = await setup({ grants: grants(CorePermission.PerformanceTemplateAi) });
    await noAi.analyze().expect(403);
    const noUpload = await setup({ grants: grants(CorePermission.PerformanceTemplateUpload) });
    await noUpload.hr.post('/api/performance/templates/file/confirm').send({ content: { stages: [], scale: null, fiscal: null } }).expect(403);
    expect(t.ai.calls).toHaveLength(0);
  });

  it('FR-118: with no AI service switched on the route answers 422 AI_NOT_CONFIGURED', async () => {
    const s = await setup({ ai: false });
    await s.analyze().expect(422).expect((r) => expect(r.body.code).toBe('AI_NOT_CONFIGURED'));
  });

  it('FR-118: a model that fails or answers off the shape is a 502 AI_UNAVAILABLE without the key in it, and does not use up the hourly turns', async () => {
    const s = await setup();
    t.ai.fail({ kind: 'failed', message: `529: overloaded ${AI_VALUES.apiKey}` });
    t.ai.fail({ kind: 'refused' });
    t.ai.answer({ nothing: true });
    for (let i = 0; i < 3; i++) {
      const res = await s.analyze().expect(502);
      expect(res.body.code).toBe('AI_UNAVAILABLE');
      expect(JSON.stringify(res.body)).not.toContain(AI_VALUES.apiKey);
    }
    for (let i = 0; i < 6; i++) { t.ai.answer(aiAnswerOf(FULL_EVAL_FILE)); await s.analyze().expect(200); }
  });

  it('FR-118: a person may analyse six files an hour: the seventh is 422 EVAL_FILE_AI_RATE_LIMITED', async () => {
    const s = await setup();
    for (let i = 0; i < 6; i++) { t.ai.answer(aiAnswerOf(FULL_EVAL_FILE)); await s.analyze().expect(200); }
    await s.analyze().expect(422).expect((r) => expect(r.body.code).toBe('EVAL_FILE_AI_RATE_LIMITED'));
    expect(t.ai.calls).toHaveLength(6);
  });
});
