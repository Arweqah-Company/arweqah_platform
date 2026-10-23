import type { Page } from '@playwright/test';
import { adminTotpUri } from './fixtures';
import { freshCode } from './totp';

const ORIGIN = { origin: 'http://localhost:4173' };

/** Turns platform admin mode on for the shared admin session through the API (the pages read it from /api/me when they load). */
export async function adminModeOnViaApi(page: Page): Promise<void> {
  const response = await page.request.post('/api/admin-mode/activate', { data: { code: await freshCode(adminTotpUri) }, headers: ORIGIN });
  if (!response.ok()) throw new Error(`admin mode was not switched on: ${response.status()}`);
}

/** The browser session is shared by every spec, so a spec that switched the mode on leaves it off again. */
export async function adminModeOffViaApi(page: Page): Promise<void> {
  await page.request.post('/api/admin-mode/deactivate', { headers: ORIGIN });
}
