import { DataSource } from 'typeorm';
import { FoundationSeeder } from './foundation.seeder';
import { runWithSeedApp } from './run-seeder';

/** Empties and re-seeds the database of the browser tests (Playwright has its own, `arweqah_platform_e2e`, so it can run beside the API e2e suite). Refuses any other environment. */
runWithSeedApp(['warn', 'error'], async (app) => {
  if (process.env.NODE_ENV !== 'test') throw new Error('reset-test-db only runs with NODE_ENV=test');
  const db = app.get(DataSource);
  if (!/_(test|e2e)$/.test(db.options.database?.toString() ?? '')) throw new Error('Refusing to reset a database that is not a test one');
  const tables: { tablename: string }[] = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`);
  await db.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await app.get(FoundationSeeder, { strict: false }).run();
});
