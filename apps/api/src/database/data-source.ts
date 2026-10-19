import 'reflect-metadata';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { envFilePaths } from '../config/env-files';
import { typeOrmOptions } from '../config/typeorm.config';
import { validateEnv } from '../config/env.schema';

// Used by the TypeORM CLI (migrations) and the seed script.
for (const path of envFilePaths()) loadEnv({ path, quiet: true });

export default new DataSource({
  ...typeOrmOptions(validateEnv(process.env)),
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
