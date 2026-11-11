// Captures the user-manual screenshots (ar RTL + en LTR) into apps/web/public/docs/images.
// Runs on its OWN database (arweqah_platform_e2e: reset, seeded with the demo organization and a known administrator
// authenticator secret) with the built API (:3100) and the built web app (:4173): the development data is never touched.
// Needs `npm run build` first. Usage: npm run docs:screenshots
import { execSync, spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/web/public/docs/images');
const DB = 'arweqah_platform_e2e';
const EMAIL = 's.magdy@arweqah.sa';
const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const API = 'http://localhost:3100/api';
const WEB = 'http://localhost:4173';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function totp(now = Date.now()) {
  let bits = '';
  for (const c of SECRET) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30000)));
  const h = createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1] & 0x0f;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
}
/** A code works once per 30-second step: wait for the next step before using one again. */
let lastStep = -1;
async function freshCode() {
  while (Math.floor(Date.now() / 30000) === lastStep) await new Promise((r) => setTimeout(r, 1000));
  lastStep = Math.floor(Date.now() / 30000);
  return totp();
}

const PAGES = [
  ['02-home', '/'], ['03-employees', '/employees'], ['04-org', '/org'], ['05-job-titles', '/job-titles'],
  ['06-companies', '/companies'], ['07-tasks', '/tasks'], ['08-tickets', '/tickets'], ['09-roles', '/roles'], ['10-permissions', '/permissions'],
  ['13-notifications', '/notifications'], ['14-profile', '/profile'], ['15-my-access', '/my-access'],
  ['16-security', '/security'], ['17-audit', '/audit'],
];

async function waitUp(url) {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`not up: ${url}`);
}

async function apiSession() {
  const post = (path, body, cookie) => fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: WEB, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body ?? {}) });
  const res = await post('/auth/totp/sign-in', { email: EMAIL, code: await freshCode() });
  if (!res.ok) throw new Error(`sign-in failed: ${res.status}`);
  const cookies = res.headers.getSetCookie().map((line) => {
    const [pair, ...attrs] = line.split(';').map((s) => s.trim());
    const [name, ...value] = pair.split('=');
    return { name, value: value.join('='), domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Lax', expires: Math.floor(Date.now() / 1000) + Number(attrs.find((a) => /^max-age=/i.test(a))?.split('=')[1] ?? 3600) };
  });
  const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  // Admin mode on (the admin pages are hidden without it) and the welcome tour skipped (it would cover every screen).
  const on = await post('/admin-mode/activate', { code: await freshCode() }, cookie);
  if (!on.ok) throw new Error(`admin mode failed: ${on.status}`);
  for (const tour of ['general', 'admin']) await post(`/me/tour/${tour}/skip`, {}, cookie);
  return cookies;
}

async function captureLang(browser, lang, cookies) {
  const dir = join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: lang === 'ar' ? 'ar-SA' : 'en-US' });
  await context.addInitScript((l) => { try { localStorage.setItem('i18nextLng', l); } catch { /* storage blocked */ } }, lang);
  const login = await context.newPage();
  await login.goto(`${WEB}/login`);
  await login.waitForLoadState('networkidle');
  await login.screenshot({ path: join(dir, '01-login.png') });
  await login.close();
  await context.addCookies(cookies);
  const page = await context.newPage();
  for (const [name, route] of PAGES) {
    await page.goto(`${WEB}${route}`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: join(dir, `${name}.png`) });
    console.log(` ${lang}/${name}.png`);
  }
  await context.close();
}

const servers = [];
try {
  execSync('npm run db:reset:test -w @arweqah-platform/api', { stdio: 'inherit', cwd: ROOT, env: { ...process.env, DB_NAME: DB, SEED_ADMIN_EMAIL: EMAIL, SEED_ADMIN_TOTP_SECRET: SECRET, SEED_DEMO_ORG: 'true' } });
  const apiEnv = { ...process.env, NODE_ENV: 'test', DB_NAME: DB, PORT: '3100', API_URL: 'http://localhost:3100', SIGN_IN_RATE_LIMIT: '1000', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_USER: '', SMTP_PASSWORD: '' };
  servers.push(spawn('node', ['apps/api/dist/main.js'], { cwd: ROOT, env: apiEnv, stdio: 'ignore' }));
  servers.push(spawn('npm', ['run', 'preview', '-w', '@arweqah-platform/web'], { cwd: ROOT, env: { ...process.env, API_PROXY_TARGET: 'http://localhost:3100' }, stdio: 'ignore' }));
  await waitUp(`${API}/health`);
  await waitUp(WEB);
  const cookies = await apiSession();
  const browser = await chromium.launch({ headless: true });
  try {
    await captureLang(browser, 'ar', cookies);
    await captureLang(browser, 'en', cookies);
  } finally {
    await browser.close();
  }
  console.log('All screenshots captured.');
} catch (err) {
  console.error('Capture failed:', err);
  process.exitCode = 1;
} finally {
  for (const s of servers) s.kill();
}
