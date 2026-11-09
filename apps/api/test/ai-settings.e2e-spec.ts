import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const VALUES = { apiKey: 'sk-ant-api03-test-key-1234567890', model: 'claude-opus-5-5' };
const ALL_KEYS = [CorePermission.IntegrationsAiView, CorePermission.IntegrationsAiEdit, CorePermission.IntegrationsAiTest, CorePermission.IntegrationsAiActivate];
const URL = '/api/integrations/ai/anthropic';

describe('The AI service in the settings (FR-126)', () => {
  const t = useTestApp();
  const signIn = async (keys: string[]) => t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...keys.map((key) => ({ key, scope: 'all' as const }))] }));
  const admin = () => signIn(ALL_KEYS);

  it('FR-126: lists Anthropic as the one provider, incomplete, with the default model filled in', async () => {
    const agent = await admin();
    const catalog = (await agent.get('/api/integrations/ai').expect(200)).body;
    expect(catalog).toMatchObject({ kind: 'ai', usingServerSettings: false });
    expect(catalog.providers).toHaveLength(1);
    expect(catalog.providers[0]).toMatchObject({ providerKey: 'anthropic', status: 'incomplete', isActive: false, missing: ['apiKey'], values: { model: 'claude-opus-5-5' } });
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
    expect(t.ai.calls[0]).toMatchObject({ apiKey: VALUES.apiKey, model: VALUES.model });
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
});
