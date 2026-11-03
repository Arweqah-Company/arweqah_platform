import { SecuritySettingsService } from '../../src/core/auth/application/security-settings.service';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { ActiveProviders } from '../../src/core/integrations/application/services/active-providers.service';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PermissionCatalog } from '../../src/core/access/application/permission-catalog';
import { MailSender } from '../../src/core/notifications/application/notification-channel';
import { MailTransportFactory } from '../../src/core/notifications/application/mail-transport';
import { TranslatorFactory } from '../../src/core/translation/domain/contracts/translator-factory';
import { Translator } from '../../src/core/translation/domain/contracts/translator';
import { LookupsSeeder } from '../../src/database/seeds/lookups.seeder';
import { Factories } from '../factories/factories';
import { AdminModeProbeController } from '../fakes/admin-mode-probe.controller';
import { CaptchaVerifier } from '../../src/core/integrations/domain/contracts/captcha-verifier';
import { FakeCaptchaVerifier } from '../fakes/fake-captcha-verifier';
import { FakeMailSender } from '../fakes/fake-mail-sender';
import { FakeMailTransportFactory, FakeProviders, FakeTranslatorFactory } from '../fakes/fake-provider-factories';
import { FakeTranslator } from '../fakes/fake-translator';

/** Stand-in for a business module's permission, so scope handling is exercised without one. */
export const DEMO_PERMISSION = 'demo.view';

/** Seeded option lists (and the level template) are loaded once; every other table is emptied before each test. */
const REFERENCE_TABLES = new Set([
  'migrations',
  'relation_types', 'relation_type_translations', 'countries', 'country_translations',
  'marital_statuses', 'marital_status_translations', 'residency_statuses', 'residency_status_translations',
  'id_types', 'id_type_translations', 'id_type_rules', 'id_type_rule_translations',
  'contract_types', 'contract_type_translations', 'gosi_systems', 'gosi_system_translations',
  'termination_reasons', 'termination_reason_translations', 'org_level_templates', 'org_level_template_translations',
]);

export interface TestContext {
  app: INestApplication;
  factories: Factories;
  db: DataSource;
  mail: FakeMailSender;
  translator: FakeTranslator;
  providers: FakeProviders;
  captcha: FakeCaptchaVerifier;
}

/**
 * Boots the real application (same pipeline as main.ts) against the test
 * database and truncates every non-reference table before each test.
 */
export function useTestApp(): TestContext {
  const ctx = {} as TestContext;
  beforeAll(async () => {
    ctx.mail = new FakeMailSender();
    ctx.translator = new FakeTranslator();
    ctx.providers = new FakeProviders();
    ctx.captcha = new FakeCaptchaVerifier();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [AdminModeProbeController] })
      .overrideProvider(MailSender)
      .useValue(ctx.mail)
      .overrideProvider(Translator)
      .useValue(ctx.translator)
      .overrideProvider(TranslatorFactory)
      .useValue(new FakeTranslatorFactory(ctx.providers))
      .overrideProvider(CaptchaVerifier)
      .useValue(ctx.captcha)
      .overrideProvider(MailTransportFactory)
      .useValue(new FakeMailTransportFactory(ctx.providers))
      .compile();
    ctx.app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(ctx.app);
    await ctx.app.init();
    ctx.app.get(PermissionCatalog).register([
      { key: DEMO_PERMISSION, module: 'demo', labelAr: 'تجريبي', labelEn: 'Demo', scopes: ['own', 'unit', 'subtree', 'company', 'all'] },
    ]);
    ctx.db = ctx.app.get(DataSource);
    await ctx.app.get(LookupsSeeder).run();
    ctx.factories = new Factories(ctx.app);
  });
  beforeEach(() => resetBetweenTests(ctx));
  afterAll(async () => {
    await ctx.app?.close();
  });
  return ctx;
}

async function truncateAll(db: DataSource): Promise<void> {
  const tables: { tablename: string }[] = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  const names = tables.map((t) => t.tablename).filter((name) => !REFERENCE_TABLES.has(name));
  await db.query(`TRUNCATE ${names.map((n) => `"${n}"`).join(', ')} RESTART IDENTITY CASCADE`);
}

/** Every test starts from empty tables, a quiet mail box and translator, and no request limit (the specs about the limit set their own). */
async function resetBetweenTests(ctx: TestContext): Promise<void> {
  ctx.mail.sent.length = 0;
  ctx.translator.calls.length = 0;
  ctx.providers.reset();
  ctx.captcha.calls.length = 0;
  ctx.app.get(ActiveProviders).invalidate('captcha');
  ctx.app.get(ActiveProviders).invalidate('translation');
  ctx.app.get(ActiveProviders).invalidate('email');
  await truncateAll(ctx.db);
  await ctx.db.query(`INSERT INTO security_settings (key, value) VALUES ('requestsPerMinute', 100000)`);
  ctx.app.get(SecuritySettingsService).invalidate();
}
