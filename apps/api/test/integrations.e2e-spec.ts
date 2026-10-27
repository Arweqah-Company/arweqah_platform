import { CorePermission, type IntegrationKind, type ProviderDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { ActiveProviders } from '../src/core/integrations/application/services/active-providers.service';
import { ActiveTranslator } from '../src/core/translation/infrastructure/adapters/active-translator.adapter';
import { TranslatorFactory } from '../src/core/translation/domain/contracts/translator-factory';
import { AppConfig } from '../src/config/app-config.service';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

interface Case {
  fr: string;
  kind: IntegrationKind;
  provider: string;
  other: string;
  otherValues: object;
  secret: string;
  values: Record<string, string | number | boolean>;
  tryIt: object;
  keys: { view: string; edit: string; test: string; activate: string };
}

const SENDER = 'Arweqah <no-reply@arweqah.sa>';
const CASES: Case[] = [
  {
    fr: 'FR-59',
    kind: 'translation',
    provider: 'aws',
    other: 'azure',
    otherValues: { key: 'azure-key-1234', region: 'uaenorth' },
    secret: 'secret-value-1234',
    values: { accessKeyId: 'AKIATESTKEY', secretAccessKey: 'secret-value-1234', region: 'us-east-1' },
    tryIt: { text: 'مرحبا بالعالم' },
    keys: {
      view: CorePermission.IntegrationsTranslationView,
      edit: CorePermission.IntegrationsTranslationEdit,
      test: CorePermission.IntegrationsTranslationTest,
      activate: CorePermission.IntegrationsTranslationActivate,
    },
  },
  {
    fr: 'FR-60',
    kind: 'email',
    provider: 'sendgrid',
    other: 'smtp',
    otherValues: { host: 'smtp.test', port: 587, from: SENDER },
    secret: 'SG.secret-key-1234',
    values: { apiKey: 'SG.secret-key-1234', from: SENDER },
    tryIt: { to: 'someone@example.com' },
    keys: {
      view: CorePermission.IntegrationsEmailView,
      edit: CorePermission.IntegrationsEmailEdit,
      test: CorePermission.IntegrationsEmailTest,
      activate: CorePermission.IntegrationsEmailActivate,
    },
  },
];

describe.each(CASES)('Provider settings: $kind ($fr)', (c) => {
  const t = useTestApp();
  const grants = [ADMIN_MODE_GRANT, ...Object.values(c.keys).map((key) => ({ key, scope: 'all' as const }))];
  const admin = async () => t.factories.signInAdminMode(await t.factories.user({ grants }));
  const url = (rest = '') => `/api/integrations/${c.kind}${rest}`;
  const providerOf = (body: { providers: ProviderDto[] }, key: string) => body.providers.find((p) => p.providerKey === key)!;

  it('lists every provider of the kind as incomplete at first', async () => {
    const res = await (await admin()).get(url()).expect(200);
    expect(res.body.kind).toBe(c.kind);
    expect(res.body.providers.length).toBeGreaterThanOrEqual(2);
    for (const p of res.body.providers) expect(p).toMatchObject({ status: 'incomplete', isActive: false });
    expect(providerOf(res.body, c.provider).missing.length).toBeGreaterThan(0);
  });

  it('saves the data without ever sending a secret back, and keeps a secret the form leaves blank', async () => {
    const agent = await admin();
    const saved = (await agent.put(url(`/${c.provider}`)).send({ values: c.values }).expect(200)).body;
    expect(saved).toMatchObject({ status: 'untested', missing: [], invalid: [] });
    expect(JSON.stringify(saved)).not.toContain(c.secret);
    expect(saved.secretsSet.length).toBeGreaterThan(0);
    const secretField = saved.secretsSet[0];
    const again = (await agent.put(url(`/${c.provider}`)).send({ values: { ...c.values, [secretField]: '' } }).expect(200)).body;
    expect(again.secretsSet).toContain(secretField);
    expect(JSON.stringify((await agent.get(url()).expect(200)).body)).not.toContain(c.secret);
    const [row] = await t.db.query<{ config: Record<string, unknown> }[]>(`SELECT config FROM integration_providers WHERE kind = $1`, [c.kind]);
    expect(JSON.stringify(row?.config)).not.toContain(c.secret);
  });

  it('refuses unknown providers (404), unknown fields (400), and reports wrong data as invalid', async () => {
    const agent = await admin();
    await agent.put(url('/nowhere')).send({ values: {} }).expect(404);
    await agent.put(url(`/${c.provider}`)).send({ values: {}, extra: 1 }).expect(400);
    const bad = (await agent.put(url(`/${c.provider}`)).send({ values: { ...c.values, from: 'not an address', accessKeyId: '' } }).expect(200)).body;
    expect(bad.status).toBe('incomplete');
    expect(bad.missing.length + bad.invalid.length).toBeGreaterThan(0);
  });

  it('cannot be activated while data is missing (422 PROVIDER_INCOMPLETE) or not yet tested (422 PROVIDER_NOT_TESTED)', async () => {
    const agent = await admin();
    await agent.post(url(`/${c.provider}/activate`)).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_INCOMPLETE'));
    await agent.put(url(`/${c.provider}`)).send({ values: { ...c.values, accessKeyId: null, from: null } }).expect(200);
    await agent.post(url(`/${c.provider}/activate`)).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_INCOMPLETE'));
    await agent.put(url(`/${c.provider}`)).send({ values: c.values }).expect(200);
    await agent.post(url(`/${c.provider}/activate`)).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_NOT_TESTED'));
  });

  it('tries a provider with the data in the form, then it can be activated; changed data must be tried again', async () => {
    const agent = await admin();
    const result = (await agent.post(url(`/${c.provider}/test`)).send({ values: c.values, ...c.tryIt }).expect(200)).body;
    expect(result.ok).toBe(true);
    if (c.kind === 'translation') expect(result.text).toBe('AWS: مرحبا بالعالم');
    else expect(t.providers.sent[0]?.to).toBe('someone@example.com');
    expect(t.providers.built[0]?.values).toMatchObject({ ...c.values });
    // The tried data was not saved yet; saving exactly it makes the provider "tested".
    const saved = (await agent.put(url(`/${c.provider}`)).send({ values: c.values }).expect(200)).body;
    expect(saved.status).toBe('tested');
    const catalog = (await agent.post(url(`/${c.provider}/activate`)).expect(200)).body;
    expect(providerOf(catalog, c.provider).isActive).toBe(true);
    // Changing the data of the active provider switches it off until it is tried and activated again.
    const changed = (await agent.put(url(`/${c.provider}`)).send({ values: { ...c.values, from: 'Other <other@arweqah.sa>', region: 'eu-west-1' } }).expect(200)).body;
    expect(changed).toMatchObject({ status: 'untested', isActive: false });
  });

  it('shows the provider\'s own error when a test fails, without the secret, and a failed test never activates', async () => {
    const agent = await admin();
    t.providers.failure = `Rejected the key ${c.secret}`;
    const result = (await agent.post(url(`/${c.provider}/test`)).send({ values: c.values, ...c.tryIt }).expect(200)).body;
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Rejected the key');
    expect(result.message).not.toContain(c.secret);
    await agent.put(url(`/${c.provider}`)).send({ values: c.values }).expect(200);
    await agent.post(url(`/${c.provider}/activate`)).expect(422);
  });

  it('refuses to try incomplete data (422) or a test without its input (422)', async () => {
    const agent = await admin();
    await agent.post(url(`/${c.provider}/test`)).send({ values: {}, ...c.tryIt }).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_INCOMPLETE'));
    await agent.post(url(`/${c.provider}/test`)).send({ values: c.values }).expect(422).expect((r) => expect(r.body.code).toBe('PROVIDER_TEST_INPUT'));
    await agent.post(url(`/${c.provider}/test`)).send({ values: c.values, to: 'not-an-address', text: '' }).expect(400);
  });

  it('keeps one active provider: activating another switches the first off, and deactivating returns to the server settings', async () => {
    const agent = await admin();
    for (const [key, values] of [[c.provider, c.values], [c.other, c.otherValues]] as const) {
      await agent.post(url(`/${key}/test`)).send({ values, ...c.tryIt }).expect(200);
      await agent.put(url(`/${key}`)).send({ values }).expect(200);
    }
    await agent.post(url(`/${c.provider}/activate`)).expect(200);
    const both = (await agent.post(url(`/${c.other}/activate`)).expect(200)).body;
    expect(both.providers.filter((p: { isActive: boolean }) => p.isActive).map((p: { providerKey: string }) => p.providerKey)).toEqual([c.other]);
    const off = (await agent.post(url('/deactivate')).expect(200)).body;
    expect(off.providers.some((p: { isActive: boolean }) => p.isActive)).toBe(false);
  });

  it('is limited to people with the keys, in admin mode (403), and every step is audited by name only', async () => {
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.get(url()).expect(403);
    const noMode = await t.factories.signIn(await t.factories.user({ grants }));
    expect((await noMode.get(url()).expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    for (const [name, key] of Object.entries(c.keys)) {
      const only = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key, scope: 'all' }] }));
      const calls = { view: () => only.get(url()), edit: () => only.put(url(`/${c.provider}`)).send({ values: c.values }), test: () => only.post(url(`/${c.provider}/test`)).send({ values: c.values, ...c.tryIt }), activate: () => only.post(url(`/${c.provider}/activate`)) } as const;
      for (const other of Object.keys(calls) as (keyof typeof calls)[]) if (other !== name) expect((await calls[other]()).status, `${name} must not allow ${other}`).toBe(403);
    }
    const agent = await admin();
    await agent.post(url(`/${c.provider}/test`)).send({ values: c.values, ...c.tryIt }).expect(200);
    await agent.put(url(`/${c.provider}`)).send({ values: c.values }).expect(200);
    await new Promise((resolve) => setTimeout(resolve, 300));
    const rows = await t.db.query<{ action: string; changes: unknown }[]>(`SELECT action, changes FROM audit_logs WHERE entity_type = $1 ORDER BY created_at`, [`integration.${c.kind}`]);
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(['integration.saved', 'integration.tested']));
    expect(JSON.stringify(rows)).not.toContain(c.secret);
  });
});

describe('Translation uses the active provider (FR-59)', () => {
  const t = useTestApp();
  const values = { accessKeyId: 'AKIATESTKEY', secretAccessKey: 'secret-value-1234', region: 'us-east-1' };
  const translator = () => new ActiveTranslator(t.app.get(ActiveProviders), t.app.get(TranslatorFactory), t.app.get(AppConfig));

  it('translates through the provider an administrator activated and follows a change of provider', async () => {
    const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, ...Object.values(CorePermission).filter((k) => k.startsWith('integrations.translation')).map((key) => ({ key, scope: 'all' as const }))] }));
    await admin.post('/api/integrations/translation/aws/test').send({ values, text: 'مرحبا' }).expect(200);
    await admin.put('/api/integrations/translation/aws').send({ values }).expect(200);
    await admin.post('/api/integrations/translation/aws/activate').expect(200);
    const active = translator();
    expect(await active.arabicToEnglish('شكرا')).toBe('AWS: شكرا');
    expect(t.providers.built.filter((b) => b.providerKey === 'aws')).toHaveLength(2);
    const azure = { key: 'azure-key-1234', region: 'uaenorth' };
    await admin.post('/api/integrations/translation/azure/test').send({ values: azure, text: 'مرحبا' }).expect(200);
    await admin.put('/api/integrations/translation/azure').send({ values: azure }).expect(200);
    await admin.post('/api/integrations/translation/azure/activate').expect(200);
    expect(await active.arabicToEnglish('شكرا')).toBe('AZURE: شكرا');
  });
});
