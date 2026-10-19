import { join } from 'node:path';

/** Root .env of the monorepo; .env.test overrides it when NODE_ENV=test. */
export function envFilePaths(): string[] {
  const root = join(__dirname, '..', '..', '..', '..');
  const files = [join(root, '.env')];
  return process.env.NODE_ENV === 'test' ? [join(root, '.env.test'), ...files] : files;
}
