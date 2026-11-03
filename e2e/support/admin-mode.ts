import type { Page } from '@playwright/test';
import { adminTotpUri } from './fixtures';
import { freshCode } from './totp';

const ORIGIN = { origin: 'http://localhost:4173' };

/** Turns platform admin mode on for the shared admin session through the API (the pages read it from /api/me when they load); already on = nothing to do, so no new code is spent. */
export async function adminModeOnViaApi(page: Page): Promise<void> {
  const me = (await (await page.request.get('/api/me')).json()) as { adminMode?: { active?: boolean } };
  if (me.adminMode?.active) return;
  const response = await page.request.post('/api/admin-mode/activate', { data: { code: await freshCode(adminTotpUri) }, headers: ORIGIN });
  if (!response.ok()) throw new Error(`admin mode was not switched on: ${response.status()}`);
}

/** The browser session is shared by every spec: the administrator\'s grants work only in this mode (FR-84), so specs switch it on in `beforeEach` and a test about the plain employee view switches it off first. */
export async function adminModeOffViaApi(page: Page): Promise<void> {
  await page.request.post('/api/admin-mode/deactivate', { headers: ORIGIN });
}
