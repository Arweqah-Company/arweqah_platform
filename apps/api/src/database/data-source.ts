import 'reflect-metadata';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { envFilePaths } from '../config/env-files';
import { typeOrmOptions } from '../config/typeorm.config';
import { validateEnv } from '../config/env.schema';

// Used by the TypeORM CLI (migrations) and the seed script.
for (const path of envFilePaths()) loadEnv({ path, quiet: true });

// Escape glob syntax so checkouts in folders like "app (1)" still find their migrations.
const migrationsDir = join(__dirname, 'migrations').replace(/[()[\]{}!*?]/g, '\\$&');

export default new DataSource({
  ...typeOrmOptions(validateEnv(process.env)),
  migrations: [`${migrationsDir}/*.{ts,js}`],
});
