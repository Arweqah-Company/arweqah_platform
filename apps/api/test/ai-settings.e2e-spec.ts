import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { AiService } from '../src/core/integrations/application/services/ai.service';
import { useTestApp } from './setup/test-app';

const VALUES = { apiKey: 'sk-ant-api03-test-key-1234567890', model: 'claude-opus-5-5' };
const ALL_KEYS = [CorePermission.IntegrationsAiView, CorePermission.IntegrationsAiEdit, CorePermission.IntegrationsAiTest, CorePermission.IntegrationsAiActivate];
const URL = '/api/integrations/ai/anthropic';

describe('The AI service in the settings (FR-126)', () => {
  const t = useTestApp();
  const signIn = async (keys: string[]) => t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...keys.map((key) => ({ key, scope: 'all' as const }))] }));
  const admin = () => signIn(ALL_KEYS);

  it('FR-126: lists Anthropic and the OpenAI-compatible (free) service, both incomplete, with their defaults filled in', async () => {
    const agent = await admin();
    const catalog = (await agent.get('/api/integrations/ai').expect(200)).body;
    expect(catalog).toMatchObject({ kind: 'ai', usingServerSettings: false });
    expect(catalog.providers.map((p: { providerKey: string }) => p.providerKey)).toEqual(['anthropic', 'compatible']);
    expect(catalog.providers[0]).toMatchObject({ providerKey: 'anthropic', status: 'incomplete', isActive: false, missing: ['apiKey'], values: { model: 'claude-opus-5-5' } });
    expect(catalog.providers[1]).toMatchObject({ providerKey: 'compatible', status: 'incomplete', isActive: false, missing: ['apiKey'], values: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash' } });
  });

  it('FR-126: saves the key without it ever coming back, and refuses to switch on before a passing test', async () => {
    const agent = await admin();
    const saved = (await agent.put(URL).send({ values: VALUES }).expect(200)).body;
    expect(JSON.stringify(saved)).not.toContain(VALUES.apiKey);
    expect(saved).toMatchObject({ status: 'untested', secretsSet: ['apiKey'], values: { model: VALUES.model } });
    const stored = (await t.db.query(`SELECT config::text AS config FROM integration_providers WHERE kind = 'ai'`)) as { config: string }[];
    expect(stored[0]?.config).not.toContain(VALUES.apiKey);
    await agent.post(`${URL}/activate`).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_NOT_TESTED'));
  });

  it('FR-126: a test sends one real request with the key and model in the form, and a pass lets it be switched on', async () => {
    const agent = await admin();
    expect((await agent.post(`${URL}/test`).send({ values: VALUES }).expect(200)).body).toMatchObject({ ok: true });
    expect(t.ai.calls).toHaveLength(1);
    expect(t.ai.calls[0]).toMatchObject({ providerKey: 'anthropic', values: { apiKey: VALUES.apiKey, model: VALUES.model } });
    await agent.put(URL).send({ values: VALUES }).expect(200);
    await agent.post(`${URL}/activate`).expect(200);
    expect((await agent.get('/api/integrations/ai').expect(200)).body.providers[0]).toMatchObject({ status: 'tested', isActive: true });
  });

  it('FR-126: a failed test shows the service\'s words without the key, and does not count as tested', async () => {
    const agent = await admin();
    t.ai.fail({ kind: 'failed', message: `401: invalid x-api-key ${VALUES.apiKey}` });
    const failed = (await agent.post(`${URL}/test`).send({ values: VALUES }).expect(200)).body;
    expect(failed.ok).toBe(false);
    expect(failed.message).toContain('401');
    expect(failed.message).not.toContain(VALUES.apiKey);
    await agent.put(URL).send({ values: VALUES }).expect(200);
    await agent.post(`${URL}/activate`).expect(422);
  });

  it('FR-126: changing the key switches an active service off until it is tried again', async () => {
    const agent = await admin();
    await agent.post(`${URL}/test`).send({ values: VALUES }).expect(200);
    await agent.put(URL).send({ values: VALUES }).expect(200);
    await agent.post(`${URL}/activate`).expect(200);
    await agent.put(URL).send({ values: { apiKey: 'sk-ant-api03-another-key-0987654321' } }).expect(200);
    expect((await agent.get('/api/integrations/ai').expect(200)).body.providers[0]).toMatchObject({ isActive: false });
  });

  it('FR-126: validation (an empty key, an unknown provider)', async () => {
    const agent = await admin();
    await agent.post(`${URL}/test`).send({ values: { apiKey: '   ' } }).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_INCOMPLETE'));
    await agent.put('/api/integrations/ai/openai').send({ values: VALUES }).expect(404);
  });

  it('FR-126: 403 without each key (view, edit, test, activate)', async () => {
    const without = (key: string) => signIn(ALL_KEYS.filter((k) => k !== key));
    await (await without(CorePermission.IntegrationsAiView)).get('/api/integrations/ai').expect(403);
    await (await without(CorePermission.IntegrationsAiEdit)).put(URL).send({ values: VALUES }).expect(403);
    await (await without(CorePermission.IntegrationsAiTest)).post(`${URL}/test`).send({ values: VALUES }).expect(403);
    await (await without(CorePermission.IntegrationsAiActivate)).post(`${URL}/activate`).expect(403);
    await (await without(CorePermission.IntegrationsAiActivate)).post('/api/integrations/ai/deactivate').expect(403);
  });

  describe('the OpenAI-compatible service (a free provider next to Claude)', () => {
    const FREE = { apiKey: 'fake-free-key-for-tests' };
    const FREE_URL = '/api/integrations/ai/compatible';

    it('FR-126: is tried with its own strategy, the key never comes back, and it can be switched on after a passing test', async () => {
      const agent = await admin();
      expect((await agent.post(`${FREE_URL}/test`).send({ values: FREE }).expect(200)).body.ok).toBe(true);
      expect(t.ai.calls[0]).toMatchObject({ providerKey: 'compatible', values: { ...FREE, baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash' } });
      const saved = (await agent.put(FREE_URL).send({ values: FREE }).expect(200)).body;
      expect(JSON.stringify(saved)).not.toContain(FREE.apiKey);
      await agent.post(`${FREE_URL}/activate`).expect(200);
      expect((await agent.get('/api/integrations/ai').expect(200)).body.providers[1]).toMatchObject({ status: 'tested', isActive: true });
    });

    it('FR-126: only one AI service is on at a time: switching the free one on switches Claude off', async () => {
      const agent = await admin();
      for (const [url, values] of [[URL, VALUES], [FREE_URL, FREE]] as const) {
        await agent.post(`${url}/test`).send({ values }).expect(200);
        await agent.put(url).send({ values }).expect(200);
        await agent.post(`${url}/activate`).expect(200);
      }
      const providers = (await agent.get('/api/integrations/ai').expect(200)).body.providers as { providerKey: string; isActive: boolean }[];
      expect(providers.map((p) => [p.providerKey, p.isActive])).toEqual([['anthropic', false], ['compatible', true]]);
    });

    it('FR-126: refuses an address that is not a public https one (422 PROVIDER_INCOMPLETE with the field), in a test and in a save', async () => {
      const agent = await admin();
      for (const baseUrl of ['http://api.groq.com/v1', 'https://169.254.169.254/latest', 'https://localhost/v1', 'https://10.0.0.5/v1']) {
        const res = await agent.post(`${FREE_URL}/test`).send({ values: { ...FREE, baseUrl } }).expect(422);
        expect(res.body).toMatchObject({ code: 'PROVIDER_INCOMPLETE', details: { invalid: ['baseUrl'] } });
      }
      expect(t.ai.calls).toHaveLength(0);
    });

    it('FR-126: a service switched on is the one the platform asks (the title-file reading uses its strategy)', async () => {
      const agent = await admin();
      await agent.post(`${FREE_URL}/test`).send({ values: FREE }).expect(200);
      await agent.put(FREE_URL).send({ values: FREE }).expect(200);
      await agent.post(`${FREE_URL}/activate`).expect(200);
      t.ai.reset();
      const active = await t.app.get(AiService).isActive();
      expect(active).toBe(true);
    });
  });

  describe('the pick list of models', () => {
    const modelsUrl = `${URL}/models`;

    it('FR-126: lists what the service offers to the key in the form, and nothing is saved by asking', async () => {
      const agent = await admin();
      const res = (await agent.post(modelsUrl).send({ values: VALUES }).expect(200)).body;
      expect(res).toEqual({ ok: true, models: ['model-b', 'model-a'], message: null });
      expect(t.ai.modelCalls[0]).toMatchObject({ providerKey: 'anthropic', values: VALUES });
      expect(((await t.db.query(`SELECT count(*)::int AS n FROM integration_providers WHERE kind = 'ai'`)) as { n: number }[])[0]?.n).toBe(0);
    });

    it('FR-126: uses the saved key when the form leaves it blank, and the free service\'s own address', async () => {
      const agent = await admin();
      await agent.put(URL).send({ values: VALUES }).expect(200);
      await agent.post(modelsUrl).send({}).expect(200);
      expect(t.ai.modelCalls[0]?.values).toMatchObject({ apiKey: VALUES.apiKey });
      await agent.post('/api/integrations/ai/compatible/models').send({ values: { apiKey: 'fake-free-key-for-tests' } }).expect(200);
      expect(t.ai.modelCalls[1]).toMatchObject({ providerKey: 'compatible', values: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai' } });
    });

    it('FR-126: a service that cannot be asked is `ok: false` with its words and without the key', async () => {
      const agent = await admin();
      t.ai.modelsAnswer = { kind: 'failed', message: `401: invalid x-api-key ${VALUES.apiKey}` };
      const res = (await agent.post(modelsUrl).send({ values: VALUES }).expect(200)).body;
      expect(res).toMatchObject({ ok: false, models: [] });
      expect(res.message).toContain('401');
      expect(res.message).not.toContain(VALUES.apiKey);
    });

    it('FR-126: validation (422 without a key or with a private address), 404 for an unknown provider, 403 without the test key', async () => {
      const agent = await admin();
      await agent.post(modelsUrl).send({}).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_INCOMPLETE'));
      await agent.post('/api/integrations/ai/compatible/models').send({ values: { apiKey: 'fake-free-key-for-tests', baseUrl: 'https://10.0.0.5/v1' } }).expect(422);
      await agent.post('/api/integrations/ai/openai/models').send({ values: VALUES }).expect(404);
      await (await signIn(ALL_KEYS.filter((k) => k !== CorePermission.IntegrationsAiTest))).post(modelsUrl).send({ values: VALUES }).expect(403);
      expect(t.ai.modelCalls).toHaveLength(0);
    });

    it('FR-126: counts against the same limit as the tries (10 a minute)', async () => {
      const agent = await admin();
      for (let i = 0; i < 10; i++) await agent.post(modelsUrl).send({ values: VALUES }).expect(200);
      await agent.post(modelsUrl).send({ values: VALUES }).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_TEST_RATE_LIMITED'));
    });
  });
});
