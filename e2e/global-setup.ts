import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ACCOUNTS_FILE, type E2eAccounts } from './support/fixtures';
import { totpFromUri } from './support/totp';

const API = 'http://localhost:3000/api';
const ADMIN = { email: 'admin@example.com', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin-Passw0rd-Dev' };
const VIEWER = { email: 'viewer@e2e.local', password: 'Viewer-Passw0rd-1' };

/**
 * Resets the test database to the seed, then prepares accounts through the real API:
 * the seeded admin enables 2FA (its role requires it) and creates a limited user.
 */
export default async function globalSetup(): Promise<void> {
  execSync('npm run db:reset:test -w @arweqah-platform/api', { stdio: 'inherit', cwd: '..' });
  const admin = new ApiSession();
  await admin.signIn(ADMIN.email, ADMIN.password);
  const { totpURI } = await admin.call<{ totpURI: string }>('POST', '/auth/two-factor/enable', { password: ADMIN.password });
  await admin.call('POST', '/auth/two-factor/verify-totp', { code: totpFromUri(totpURI) });
  const role = await admin.call<{ id: string }>('POST', '/roles', {
    nameAr: 'مشاهد', nameEn: 'Viewer', permissions: [{ key: 'users.view', scope: 'company' }],
  });
  await admin.call('POST', '/users', { name: 'مستخدم محدود', email: VIEWER.email, password: VIEWER.password, roleIds: [role.id] });
  const data: E2eAccounts = { admin: { ...ADMIN, totpUri: totpURI }, viewer: VIEWER };
  mkdirSync(dirname(ACCOUNTS_FILE), { recursive: true });
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(data));
}

class ApiSession {
  private cookie = '';

  async signIn(email: string, password: string): Promise<void> {
    const res = await fetch(`${API}/auth/sign-in/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:4173' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(`sign-in failed: ${res.status}`);
    this.cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }

  async call<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'content-type': 'application/json', cookie: this.cookie, origin: 'http://localhost:4173' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${await res.text()}`);
    const setCookie = res.headers.getSetCookie();
    if (setCookie.length) this.cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
    return (res.status === 204 ? undefined : await res.json()) as T;
  }
}
