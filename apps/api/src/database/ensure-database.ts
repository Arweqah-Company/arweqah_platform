import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';
import { envFilePaths } from '../config/env-files';
import { validateEnv } from '../config/env.schema';

for (const path of envFilePaths()) loadEnv({ path, quiet: true });

/** Creates the database named by DB_NAME when it is missing, so a second test suite can have a database of its own. Only `_test` and `_e2e` databases, only with NODE_ENV=test. */
async function main(): Promise<void> {
  const env = validateEnv(process.env);
  if (env.NODE_ENV !== 'test' || !/^[a-z0-9_]+_(test|e2e)$/.test(env.DB_NAME)) throw new Error(`Refusing to create "${env.DB_NAME}": only *_test or *_e2e databases, with NODE_ENV=test`);
  const client = new Client({ host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD, database: 'postgres', ssl: env.DB_SSL ? { rejectUnauthorized: true } : false });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.DB_NAME]);
    if (found.rowCount === 0) await client.query(`CREATE DATABASE ${client.escapeIdentifier(env.DB_NAME)}`); // DDL cannot take parameters: the name is checked above and escaped
    console.log(found.rowCount === 0 ? `Created database ${env.DB_NAME}` : `Database ${env.DB_NAME} exists`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
