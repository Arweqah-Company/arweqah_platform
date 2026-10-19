import type { DataSourceOptions } from 'typeorm';
import { ENTITIES } from '../database/entities';
import type { Env } from './env.schema';

type DbEnv = Pick<Env, 'DB_HOST' | 'DB_PORT' | 'DB_NAME' | 'DB_USER' | 'DB_PASSWORD' | 'DB_SSL'>;

/** Shared by the Nest app and the TypeORM CLI. The CLI data source adds the migrations. */
export function typeOrmOptions(env: DbEnv): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
    entities: ENTITIES,
    uuidExtension: 'pgcrypto',
    synchronize: false,
    migrationsRun: false,
  };
}
