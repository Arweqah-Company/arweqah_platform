import { CorePermission } from '@arweqah-platform/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { SecuritySettingsService } from '../src/core/auth/application/security-settings.service';
import { ADMIN_MODE_GRANT, nextIp, type TestUser } from './factories/factories';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';

const ALL = 'all' as const;
const SETTINGS = [ADMIN_MODE_GRANT, { key: CorePermission.SecuritySettingsView, scope: ALL }, { key: CorePermission.SecuritySettingsEdit, scope: ALL }];
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

describe('Sessions, trusted devices and the security settings (FR-73)', () => {
  const t = useTestApp();
  /** The days the administrator allows (0 = none), written behind the service's back like a setting changed on another server. */
  const setDays = async (days: number) => {
    await t.db.query(`INSERT INTO security_settings (key, value) VALUES ('trustedDeviceDays', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [days]);
    t.app.get(SecuritySettingsService).invalidate();
  };
  // The settings are read through a short cache that outlives a test.
  beforeEach(() => t.app.get(SecuritySettingsService).invalidate());

  /** A second sign-in of the same person (their own browser), with this browser's words. */
  async function signInAgain(user: TestUser, agent = request.agent(t.app.getHttpServer())) {
    await t.factories.freshStep(user);
    await agent.post('/api/auth/totp/sign-in').set('x-forwarded-for', nextIp()).set('user-agent', CHROME).send({ email: user.email, code: codeFor(user.secret, Date.now() + 30_000) }).expect(200);
    return agent;
  }

  describe('sessions', () => {
    it('lists the person\'s sign-ins with the current one marked, a readable device and a hidden address, and only theirs', async () => {
      const user = await t.factories.user();
      const first = await t.factories.signIn(user);
      await signInAgain(user);
      const other = await t.factories.signIn(await t.factories.user());
      const list = (await first.get('/api/me/sessions').expect(200)).body as { id: string; device: string; ip: string | null; current: boolean }[];
      expect(list).toHaveLength(2);
      expect(list.filter((s) => s.current)).toHaveLength(1);
      expect(list.some((s) => s.device === 'Chrome / Windows')).toBe(true);
      expect(list.every((s) => s.ip === null || /\.x$|…$/.test(s.ip))).toBe(true);
      expect(((await other.get('/api/me/sessions').expect(200)).body as unknown[]).length).toBe(1);
    });

    it('ends one session, which stops working, and refuses someone else\'s; then ends all the others and keeps the current one', async () => {
      const user = await t.factories.user();
      const current = await t.factories.signIn(user);
      const second = await signInAgain(user);
      const third = await signInAgain(user);
      const list = (await current.get('/api/me/sessions').expect(200)).body as { id: string; current: boolean }[];
      const secondId = list.find((s) => !s.current)?.id as string;
      const stranger = await t.factories.signIn(await t.factories.user());
      await stranger.delete(`/api/me/sessions/${secondId}`).expect(404);
      await current.delete(`/api/me/sessions/${secondId}`).expect(204);
      await current.delete(`/api/me/sessions/${secondId}`).expect(404);
      const stillThere = (await current.get('/api/me/sessions').expect(200)).body as unknown[];
      expect(stillThere).toHaveLength(2);
      const ended = (await current.delete('/api/me/sessions').expect(200)).body as { ended: number };
      expect(ended.ended).toBe(1);
      await current.get('/api/me').expect(200);
      const open = await Promise.all([second.get('/api/me'), third.get('/api/me')]);
      expect(open.filter((r) => r.status === 200)).toHaveLength(0);
    });
  });

  describe('trusted devices', () => {
    /** The person signs in with Microsoft (no code yet), then enters the code and asks to trust this browser. */
    async function codeStep(user: TestUser, agent: ReturnType<typeof request.agent>, remember: boolean) {
      await t.factories.freshStep(user);
      await t.factories.forgetCode(user);
      return agent.post('/api/mfa/verify').send({ code: codeFor(user.secret, Date.now() + 30_000), rememberDevice: remember });
    }

    it('trusts nothing while the administrator has not allowed any day, and sets a cookie when they have', async () => {
      const user = await t.factories.user();
      const agent = await t.factories.signIn(user);
      const off = await codeStep(user, agent, true);
      expect(off.status).toBe(204);
      expect(off.headers['set-cookie']).toBeUndefined();
      expect(await t.db.query('SELECT 1 FROM trusted_devices WHERE user_id = $1', [user.id])).toHaveLength(0);
      await setDays(30);
      const on = await codeStep(user, agent, true);
      expect(String(on.headers['set-cookie'])).toMatch(/arweqah_device=.+HttpOnly.+SameSite=Lax/i);
      expect(((await agent.get('/api/me/trusted-devices').expect(200)).body as { current: boolean }[])).toHaveLength(1);
    });

    it('FR-73: e-mail + code with "remember this device" trusts the browser only when the administrator allows it', async () => {
      const user = await t.factories.user();
      const send = async () => {
        await t.factories.freshStep(user);
        return request(t.app.getHttpServer()).post('/api/auth/totp/sign-in').set('x-forwarded-for', nextIp()).send({ email: user.email, code: codeFor(user.secret, Date.now() + 30_000), rememberDevice: true });
      };
      const off = await send();
      expect(off.status).toBe(200);
      expect(String(off.headers['set-cookie'])).not.toMatch(/arweqah_device/);
      await setDays(30);
      const on = await send();
      expect(String(on.headers['set-cookie'])).toMatch(/arweqah_device=.+HttpOnly/i);
      expect(await t.db.query('SELECT 1 FROM trusted_devices WHERE user_id = $1', [user.id])).toHaveLength(1);
    });

    it('skips the code step on a trusted browser, but not on another one, and stops after the days end or when it is taken off', async () => {
      await setDays(30);
      const user = await t.factories.user();
      const browser = await t.factories.signIn(user);
      await codeStep(user, browser, true);
      const device = ((await browser.get('/api/me/trusted-devices').expect(200)).body as { id: string; current: boolean; label: string }[])[0] as { id: string; current: boolean; label: string };
      expect(device.current).toBe(true);
      // The same browser signs in again with Microsoft: no code yet, then the skip works.
      await t.factories.forgetCode(user);
      expect((await browser.post('/api/mfa/trusted-skip').expect(200)).body).toEqual({ skipped: true });
      expect(((await browser.get('/api/me').expect(200)).body as { mfaVerified: boolean }).mfaVerified).toBe(true);
      // Another browser has no cookie.
      const other = await signInAgain(user);
      await t.factories.forgetCode(user);
      expect((await other.post('/api/mfa/trusted-skip').expect(200)).body).toEqual({ skipped: false });
      // The days end.
      await t.db.query(`UPDATE trusted_devices SET expires_at = now() - interval '1 day' WHERE user_id = $1`, [user.id]);
      await t.factories.forgetCode(user);
      expect((await browser.post('/api/mfa/trusted-skip').expect(200)).body).toEqual({ skipped: false });
    });

    it('is switched off at once when the administrator sets the days to 0, and revoked with the authenticator reset or the account', async () => {
      await setDays(30);
      const user = await t.factories.user();
      const browser = await t.factories.signIn(user);
      await codeStep(user, browser, true);
      await setDays(0);
      await t.factories.forgetCode(user);
      expect((await browser.post('/api/mfa/trusted-skip').expect(200)).body).toEqual({ skipped: false });
      await setDays(30);
      await t.db.query('DELETE FROM trusted_devices WHERE user_id = $1', [user.id]);
      await codeStep(user, browser, true);
      const hr = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.EmployeesView, scope: ALL }, { key: CorePermission.EmployeesResetAuthenticator, scope: ALL }] }));
      await hr.post(`/api/employees/${user.employeeId}/reset-authenticator`).expect(200);
      expect(await t.db.query('SELECT 1 FROM trusted_devices WHERE user_id = $1', [user.id])).toHaveLength(0);
    });

    it('FR-73 journey: Microsoft sign-in, code + "remember this device", sign out, Microsoft sign-in again in the same browser: no code is asked', async () => {
      await setDays(5);
      const user = await t.factories.user();
      // Day 1: the browser (one cookie jar) signs in with Microsoft and the person enters the code and ticks "remember this device".
      const browser = await t.factories.signIn(user);
      await t.factories.forgetCode(user);
      expect(((await browser.get('/api/me').expect(200)).body as { mfaVerified: boolean; trustedDevicesEnabled: boolean })).toMatchObject({ mfaVerified: false, trustedDevicesEnabled: true });
      const verified = await codeStep(user, browser, true);
      expect(verified.status).toBe(204);
      expect(String(verified.headers['set-cookie'])).toMatch(/arweqah_device=.+Max-Age=432000.+HttpOnly/i);
      // The person signs out: the session ends, the device cookie stays in the browser.
      await browser.post('/api/auth/sign-out').set('origin', 'http://localhost').expect(200);
      await browser.get('/api/me').expect(401);
      // Day 2: Microsoft creates a new session (no code yet); the code page asks the server to skip, with the same browser's cookie.
      await signInAgain(user, browser);
      await t.factories.forgetCode(user);
      expect(((await browser.get('/api/me').expect(200)).body as { mfaVerified: boolean }).mfaVerified).toBe(false);
      expect((await browser.post('/api/mfa/trusted-skip').expect(200)).body).toEqual({ skipped: true });
      expect(((await browser.get('/api/me').expect(200)).body as { mfaVerified: boolean }).mfaVerified).toBe(true);
      // A browser that never ticked the box still gets the code step.
      const stranger = await signInAgain(user);
      await t.factories.forgetCode(user);
      expect((await stranger.post('/api/mfa/trusted-skip').expect(200)).body).toEqual({ skipped: false });
    });

    it('lets the person take a trusted browser off their list, and not someone else\'s', async () => {
      await setDays(30);
      const user = await t.factories.user();
      const browser = await t.factories.signIn(user);
      await codeStep(user, browser, true);
      const id = ((await browser.get('/api/me/trusted-devices').expect(200)).body as { id: string }[])[0]?.id as string;
      const stranger = await t.factories.signIn(await t.factories.user());
      await stranger.delete(`/api/me/trusted-devices/${id}`).expect(404);
      await browser.delete(`/api/me/trusted-devices/${id}`).expect(204);
      expect((await browser.get('/api/me/trusted-devices').expect(200)).body).toEqual([]);
    });
  });

  describe('the settings', () => {
    it('reads the defaults, saves new numbers within their limits, audits it, and answers 403 and 400 where it should', async () => {
      const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: [...SETTINGS, { key: CorePermission.AuditView, scope: ALL }] }));
      // The tests lift the request limit (100 000); a fresh system has the default of 600.
      expect((await admin.get('/api/security-settings').expect(200)).body).toEqual({ trustedDeviceDays: 0, requestsPerMinute: 100000, impersonationEnabled: 0, impersonationIdleMinutes: 30 });
      expect((await admin.put('/api/security-settings').send({ trustedDeviceDays: 14, requestsPerMinute: 900, impersonationEnabled: 0, impersonationIdleMinutes: 30 }).expect(200)).body).toEqual({ trustedDeviceDays: 14, requestsPerMinute: 900, impersonationEnabled: 0, impersonationIdleMinutes: 30 });
      expect((await admin.get('/api/security-settings').expect(200)).body).toMatchObject({ trustedDeviceDays: 14 });
      await admin.put('/api/security-settings').send({ trustedDeviceDays: 1000, requestsPerMinute: 900, impersonationEnabled: 0, impersonationIdleMinutes: 30 }).expect(400);
      await admin.put('/api/security-settings').send({ trustedDeviceDays: 14, requestsPerMinute: 5, impersonationEnabled: 0, impersonationIdleMinutes: 30 }).expect(400);
      // A page load sends dozens of requests: a limit that low would stop the whole platform for one person.
      await admin.put('/api/security-settings').send({ trustedDeviceDays: 14, requestsPerMinute: 30, impersonationEnabled: 0, impersonationIdleMinutes: 30 }).expect(400);
      await admin.put('/api/security-settings').send({ trustedDeviceDays: 14, requestsPerMinute: 900, impersonationEnabled: 0, impersonationIdleMinutes: 30, extra: 1 }).expect(400);
      const log = (await admin.get('/api/audit-logs').expect(200)).body.items as { action: string }[];
      expect(log.map((l) => l.action)).toContain('security.settings_updated');
      const viewOnly = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: CorePermission.SecuritySettingsView, scope: ALL }] }));
      await viewOnly.get('/api/security-settings').expect(200);
      await viewOnly.put('/api/security-settings').send({ trustedDeviceDays: 1, requestsPerMinute: 900, impersonationEnabled: 0, impersonationIdleMinutes: 30 }).expect(403);
      const plain = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.SecuritySettingsView, scope: ALL }] }));
      await plain.get('/api/security-settings').expect(403);
    });
  });

  describe('the e-mail domains', () => {
    const payload = (org: Awaited<ReturnType<typeof t.factories.org>>, email: string) => ({
      companyId: org.unitA.companyId, orgNodeId: org.unitA.id, jobTitleId: org.unitA.titleId, workEmail: email, employeeNumber: `N${Math.random().toString(36).slice(2, 8)}`, fullName: 'موظف جديد', fullNameEn: 'New Employee', startDate: '2025-01-01',
    });

    it('sets the list, lower-cases and sorts it, refuses what is not a domain, audits it, and keeps it for who may edit', async () => {
      const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: [...SETTINGS, { key: CorePermission.AuditView, scope: ALL }] }));
      expect((await admin.get('/api/security-settings/email-domains').expect(200)).body).toEqual({ domains: [] });
      expect((await admin.put('/api/security-settings/email-domains').send({ domains: ['Arweqah.sa', 'sub.example.com', 'arweqah.sa'] }).expect(200)).body).toEqual({ domains: ['arweqah.sa', 'sub.example.com'] });
      await admin.put('/api/security-settings/email-domains').send({ domains: ['not a domain'] }).expect(400);
      await admin.put('/api/security-settings/email-domains').send({ domains: ['@arweqah.sa'] }).expect(400);
      await admin.put('/api/security-settings/email-domains').send({ domains: [], extra: 1 }).expect(400);
      expect(((await admin.get('/api/audit-logs').expect(200)).body.items as { action: string }[]).map((l) => l.action)).toContain('security.email_domains_updated');
      const viewOnly = await t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: CorePermission.SecuritySettingsView, scope: ALL }] }));
      await viewOnly.put('/api/security-settings/email-domains').send({ domains: [] }).expect(403);
    });

    it('allows only the default domain while the list is empty, and the listed domains once it is set', async () => {
      const org = await t.factories.org();
      const hr = await t.factories.signIn(await t.factories.user({ grants: [{ key: CorePermission.EmployeesCreate, scope: ALL }, { key: CorePermission.EmployeesView, scope: ALL }, { key: CorePermission.LookupsView, scope: ALL }] }));
      await hr.post('/api/employees').send(payload(org, `a${Date.now()}@arweqah.sa`)).expect(201);
      expect((await hr.post('/api/employees').send(payload(org, `a${Date.now()}@partner.org`)).expect(422)).body).toMatchObject({ code: 'FIELD_RULE', details: { path: 'workEmail' } });
      const admin = await t.factories.signInAdminMode(await t.factories.user({ grants: SETTINGS }));
      await admin.put('/api/security-settings/email-domains').send({ domains: ['partner.org'] }).expect(200);
      await hr.post('/api/employees').send(payload(org, `b${Date.now()}@arweqah.sa`)).expect(422);
      await hr.post('/api/employees').send(payload(org, `c${Date.now()}@Partner.ORG`)).expect(201);
    });
  });
});
