import './seed-env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { FoundationSeeder } from './foundation.seeder';

/** Empties and re-seeds the TEST database for Playwright runs. Refuses any other environment. */
async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'test') throw new Error('reset-test-db only runs with NODE_ENV=test');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  try {
    const db = app.get(DataSource);
    if (!db.options.database?.toString().endsWith('_test')) throw new Error('Refusing to reset a non-test database');
    const tables: { tablename: string }[] = await db.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`,
    );
    await db.query(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
    await app.get(FoundationSeeder, { strict: false }).run();
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
