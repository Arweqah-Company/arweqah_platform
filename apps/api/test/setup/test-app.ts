import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PermissionCatalog } from '../../src/core/access/application/permission-catalog';
import { MailSender } from '../../src/core/notifications/application/notification-channel';
import { LookupsSeeder } from '../../src/database/seeds/lookups.seeder';
import { Factories } from '../factories/factories';
import { FakeMailSender } from '../fakes/fake-mail-sender';

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
}

/**
 * Boots the real application (same pipeline as main.ts) against the test
 * database and truncates every non-reference table before each test.
 */
export function useTestApp(): TestContext {
  const ctx = {} as TestContext;
  beforeAll(async () => {
    ctx.mail = new FakeMailSender();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailSender)
      .useValue(ctx.mail)
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
  beforeEach(async () => {
    ctx.mail.sent.length = 0;
    await truncateAll(ctx.db);
  });
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
