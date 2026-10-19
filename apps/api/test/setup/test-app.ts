import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { Factories } from '../factories/factories';
import { FakeMailSender } from '../fakes/fake-mail-sender';
import { MailSender } from '../../src/core/notifications/application/notification-channel';

export interface TestContext {
  app: INestApplication;
  factories: Factories;
  db: DataSource;
  mail: FakeMailSender;
}

/**
 * Boots the real application (same pipeline as main.ts) against the test
 * database and truncates every table before each test.
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
    ctx.db = ctx.app.get(DataSource);
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
  const tables: { tablename: string }[] = await db.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  await db.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
}
