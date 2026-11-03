import { CorePermission } from '@arweqah-platform/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const KEYS = { siteKey: '0x4AAAAAAAsite', secretKey: '0x4AAAAAAAsecret-1234' };
const ALL_KEYS = [CorePermission.IntegrationsCaptchaView, CorePermission.IntegrationsCaptchaEdit, CorePermission.IntegrationsCaptchaTest, CorePermission.IntegrationsCaptchaActivate];

describe('Bot protection with Cloudflare Turnstile (FR-78)', () => {
  const t = useTestApp();
  const admin = async () => t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...ALL_KEYS.map((key) => ({ key, scope: 'all' as const }))] }));
  const identify = (body: Record<string, unknown>) => request(t.app.getHttpServer()).post('/api/mfa/identify').send(body);
  const config = () => request(t.app.getHttpServer()).get('/api/captcha/config');

  /** Saves the keys, passes the test with the real flow, and switches the check on. */
  async function activate() {
    const agent = await admin();
    expect((await agent.post('/api/integrations/captcha/turnstile/test').send({ values: KEYS, captchaToken: 'good' }).expect(200)).body.ok).toBe(true);
    await agent.put('/api/integrations/captcha/turnstile').send({ values: KEYS }).expect(200);
    await agent.post('/api/integrations/captcha/turnstile/activate').expect(200);
    return agent;
  }

  it('FR-78: with no active provider nothing is asked and the page is told there is no check', async () => {
    const person = await t.factories.user();
    expect((await config().expect(200)).body).toEqual({ provider: null, siteKey: null });
    await identify({ email: person.email }).expect(200);
    expect(t.captcha.calls).toHaveLength(0);
  });

  it('FR-78: the keys are saved without the secret coming back, and cannot be activated before a passing test', async () => {
    const agent = await admin();
    const saved = (await agent.put('/api/integrations/captcha/turnstile').send({ values: KEYS }).expect(200)).body;
    expect(JSON.stringify(saved)).not.toContain(KEYS.secretKey);
    expect(saved).toMatchObject({ status: 'untested', secretsSet: ['secretKey'] });
    expect(saved.values.siteKey).toBe(KEYS.siteKey);
    await agent.post('/api/integrations/captcha/turnstile/activate').expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_NOT_TESTED'));
    await agent.post('/api/integrations/captcha/turnstile/test').send({ values: KEYS }).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_TEST_INPUT'));
    const failed = (await agent.post('/api/integrations/captcha/turnstile/test').send({ values: KEYS, captchaToken: 'wrong' }).expect(200)).body;
    expect(failed.ok).toBe(false);
    expect(failed.message).not.toContain(KEYS.secretKey);
    await agent.post('/api/integrations/captcha/turnstile/activate').expect(422);
  });

  it('FR-78: once active, the sign-in page gets the site key only, and identify needs a good answer (422 CAPTCHA_FAILED otherwise)', async () => {
    await activate();
    const person = await t.factories.user();
    const shown = (await config().expect(200)).body;
    expect(shown).toEqual({ provider: 'turnstile', siteKey: KEYS.siteKey });
    expect(JSON.stringify(shown)).not.toContain(KEYS.secretKey);
    for (const body of [{ email: person.email }, { email: person.email, captchaToken: 'wrong' }]) {
      await identify(body).expect(422).expect((r) => expect(r.body.code).toBe('CAPTCHA_FAILED'));
    }
    await identify({ email: person.email, captchaToken: 'good' }).expect(200);
    expect(t.captcha.calls.at(-1)).toMatchObject({ secretKey: KEYS.secretKey, token: 'good' });
  });

  it('FR-78: when Cloudflare cannot be reached the person gets in and the audit says so', async () => {
    await activate();
    const person = await t.factories.user();
    await identify({ email: person.email, captchaToken: 'down' }).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 200));
    const rows = await t.db.query<{ action: string }[]>(`SELECT action FROM audit_logs WHERE action = 'captcha.unavailable'`);
    expect(rows).toHaveLength(1);
  });

  it('FR-78: changing the keys of the active provider switches the check off until it is tried again, and every step is audited without the keys', async () => {
    const agent = await activate();
    const changed = (await agent.put('/api/integrations/captcha/turnstile').send({ values: { ...KEYS, siteKey: '0x4AAAAAAother' } }).expect(200)).body;
    expect(changed).toMatchObject({ status: 'untested', isActive: false });
    expect((await config().expect(200)).body.provider).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const logged = JSON.stringify(await t.db.query(`SELECT changes FROM audit_logs WHERE entity_type = 'integration.captcha'`));
    expect(logged).not.toContain(KEYS.secretKey);
  });

  it('FR-78: only people with the keys, in admin mode, reach the settings (403)', async () => {
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.get('/api/integrations/captcha').expect(403);
    const noMode = await t.factories.signIn(await t.factories.user({ grants: ALL_KEYS.map((key) => ({ key, scope: 'all' as const })) }));
    expect((await noMode.get('/api/integrations/captcha').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    const viewOnly = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: CorePermission.IntegrationsCaptchaView, scope: 'all' }] }));
    await viewOnly.get('/api/integrations/captcha').expect(200);
    await viewOnly.put('/api/integrations/captcha/turnstile').send({ values: KEYS }).expect(403);
    await viewOnly.post('/api/integrations/captcha/turnstile/activate').expect(403);
  });
});
