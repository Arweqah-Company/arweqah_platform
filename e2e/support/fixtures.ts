import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The browser tests have a database of their own, so they can run at the same time as the API e2e suite (which uses `arweqah_platform_test`). Created and migrated by `npm run db:prepare:e2e` in the API. */
export const E2E_DB_NAME = 'arweqah_platform_e2e';

/** The startup administrator of the test database: signs in by e-mail and the code of this (test-only) secret. */
export const ADMIN_EMAIL = 's.magdy@arweqah.sa';
export const ADMIN_TOTP_SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
export const adminTotpUri = `otpauth://totp/Arweqah:${ADMIN_EMAIL}?secret=${ADMIN_TOTP_SECRET}&issuer=Arweqah`;

const AUTH_DIR = join(import.meta.dirname, '..', '.auth');
/** A signed-in browser state saved by global-setup, so only the sign-in specs go through the sign-in page. */
export const ADMIN_STATE = join(AUTH_DIR, 'admin.json');
export const AUTH_DIRECTORY = AUTH_DIR;

export const adminCookies = (): { cookies: unknown[] } => JSON.parse(readFileSync(ADMIN_STATE, 'utf8')) as { cookies: unknown[] };
