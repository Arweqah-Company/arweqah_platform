import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ADMIN_EMAIL, ADMIN_STATE, ADMIN_TOTP_SECRET, AUTH_DIRECTORY, adminTotpUri } from './support/fixtures';
import { forgetUsedCodes, freshCode } from './support/totp';

const API = 'http://localhost:3100/api';
const WEB = 'http://localhost:4173';

/**
 * Resets the test database to the seed (the administrator gets a known authenticator secret and every company
 * gets a sample structure), then signs the administrator in once through the real API and saves the browser state.
 */
export default async function globalSetup(): Promise<void> {
  execSync('npm run db:reset:test -w @arweqah-platform/api', {
    stdio: 'inherit',
    cwd: '..',
    env: { ...process.env, SEED_ADMIN_EMAIL: ADMIN_EMAIL, SEED_ADMIN_TOTP_SECRET: ADMIN_TOTP_SECRET, SEED_DEMO_ORG: 'true' },
  });
  forgetUsedCodes();
  const res = await fetch(`${API}/auth/totp/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB },
    body: JSON.stringify({ email: ADMIN_EMAIL, code: await freshCode(adminTotpUri) }),
  });
  if (!res.ok) throw new Error(`administrator sign-in failed: ${res.status} ${await res.text()}`);
  const cookies = res.headers.getSetCookie().map((line) => {
    const [pair = '', ...attributes] = line.split(';').map((s) => s.trim());
    const [name = '', ...value] = pair.split('=');
    const maxAge = Number(attributes.find((a) => /^max-age=/i.test(a))?.split('=')[1] ?? 3600);
    return { name, value: value.join('='), domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' as const, expires: Math.floor(Date.now() / 1000) + maxAge };
  });
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  // The welcome tour would cover every screen the other specs click through: the administrator has already seen it.
  // The administrative steps belong to the person only while admin mode is on (FR-84), so the tours are skipped inside it; skipped outside, the
  // steps would count as «new» the first time a spec switches the mode on and a prompt would cover the page.
  const headers = { cookie: cookieHeader, origin: WEB, 'content-type': 'application/json' };
  const on = await fetch(`${API}/admin-mode/activate`, { method: 'POST', headers, body: JSON.stringify({ code: await freshCode(adminTotpUri) }) });
  if (!on.ok) throw new Error(`admin mode was not switched on: ${on.status} ${await on.text()}`);
  for (const tour of ['general', 'admin']) await fetch(`${API}/me/tour/${tour}/skip`, { method: 'POST', headers });
  await fetch(`${API}/admin-mode/deactivate`, { method: 'POST', headers });
  mkdirSync(AUTH_DIRECTORY, { recursive: true });
  writeFileSync(ADMIN_STATE, JSON.stringify({ cookies, origins: [] }));
}
