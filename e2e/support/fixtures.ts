import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Accounts prepared by global-setup.ts for the UI specs. */
export interface E2eAccounts {
  admin: { email: string; password: string; totpUri: string };
  viewer: { email: string; password: string };
}

export const ACCOUNTS_FILE = join(import.meta.dirname, '..', '.auth', 'accounts.json');

export function accounts(): E2eAccounts {
  return JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf8')) as E2eAccounts;
}
