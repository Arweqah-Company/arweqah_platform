import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ADMIN_STATE } from '../../support/fixtures';

test.describe('Access control and client-side security (NFR-02)', () => {
  test.use({ storageState: ADMIN_STATE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('أهلًا');
  });

  test('no token or session data is stored where scripts can read it', async ({ page }) => {
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(storage).not.toMatch(/token|session|better-auth/i);
    expect(await page.evaluate(() => document.cookie)).not.toContain('session_token');
  });
});

test('the built web bundle contains no server secret values', () => {
  const root = join(import.meta.dirname, '..', '..', '..');
  // Values, not names: libraries legitimately mention variable names such as BETTER_AUTH_SECRET.
  const envFile = join(root, '.env');
  // Locally the values come from .env; in CI from the job environment.
  const fileEnv = Object.fromEntries(
    (existsSync(envFile) ? readFileSync(envFile, 'utf8') : '')
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)=(.+)$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2]]),
  );
  const env: Record<string, string | undefined> = { ...fileEnv, ...process.env };
  const secrets = ['BETTER_AUTH_SECRET', 'FIELD_ENCRYPTION_KEY', 'DB_PASSWORD', 'MICROSOFT_CLIENT_SECRET', 'SMTP_PASSWORD']
    .map((name) => env[name])
    .filter((value): value is string => !!value && value.length >= 8);
  expect(secrets.length).toBeGreaterThan(0);
  const dist = join(root, 'apps', 'web', 'dist', 'assets');
  for (const file of readdirSync(dist).filter((f) => f.endsWith('.js'))) {
    const content = readFileSync(join(dist, file), 'utf8');
    for (const secret of secrets) expect(content.includes(secret), `${file} contains a secret value`).toBe(false);
    expect(content).not.toMatch(/AKIA[0-9A-Z]{16}/);
  }
});
