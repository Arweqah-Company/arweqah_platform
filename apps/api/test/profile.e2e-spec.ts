import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

describe('Own profile and theme (FR-33)', () => {
  const t = useTestApp();

  async function signedIn() {
    const user = await t.factories.user();
    return { user, agent: await t.factories.signIn(user) };
  }

  it('shows the person their own page: preferences and employee record, with sensitive fields hidden', async () => {
    const { user, agent } = await signedIn();
    const res = await agent.get('/api/me/profile').expect(200);
    expect(res.body.preferences).toEqual({ locale: 'ar', theme: 'system' });
    expect(res.body.employee).toMatchObject({ id: user.employeeId, workEmail: user.email, sensitiveHidden: true, idNumber: null, iban: null, monthlyGrossSalary: null });
    expect((await agent.get('/api/me').expect(200)).body.theme).toBe('system');
  });

  it('saves the theme, the language and three contact details, and nothing else', async () => {
    const { agent } = await signedIn();
    const res = await agent.put('/api/me/profile').send({ theme: 'dark', locale: 'en', personalPhone: '+966501234567', personalEmail: 'me.personal@example.com', fullNameEn: 'Sara Ahmed' }).expect(200);
    expect(res.body.preferences).toEqual({ locale: 'en', theme: 'dark' });
    expect(res.body.employee).toMatchObject({ personalPhone: '+966501234567', personalEmail: 'me.personal@example.com', fullNameEn: 'Sara Ahmed' });
    const me = (await agent.get('/api/me').expect(200)).body;
    expect(me).toMatchObject({ theme: 'dark', locale: 'en' });
  });

  it('changes only what is sent and clears a contact detail sent as null', async () => {
    const { agent } = await signedIn();
    await agent.put('/api/me/profile').send({ personalPhone: '+966501234567', theme: 'dark' }).expect(200);
    const res = await agent.put('/api/me/profile').send({ personalPhone: null }).expect(200);
    expect(res.body.employee.personalPhone).toBeNull();
    expect(res.body.preferences.theme).toBe('dark');
  });

  it('refuses everything HR owns, unknown values and bad formats (400), and a personal e-mail equal to the work e-mail (422)', async () => {
    const { user, agent } = await signedIn();
    for (const body of [{ fullName: 'Hacker' }, { monthlyGrossSalary: 99999 }, { orgNodeId: '00000000-0000-4000-8000-000000000000' }, { roleIds: [] }, { theme: 'blue' }, { locale: 'fr' }, { personalPhone: '0501234567' }, { fullNameEn: 'اسم عربي' }]) {
      await agent.put('/api/me/profile').send(body).expect(400);
    }
    await agent.put('/api/me/profile').send({ personalEmail: user.email }).expect(422);
  });

  it('writes the field names to the audit log, never the values', async () => {
    const auditor = await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: 'audit.view', scope: 'all' }] });
    const { agent } = await signedIn();
    await agent.put('/api/me/profile').send({ personalPhone: '+966501234567', theme: 'dark' }).expect(200);
    await new Promise((r) => setTimeout(r, 200));
    const log = (await (await t.factories.signInAdminMode(auditor)).get('/api/audit-logs').query({ action: 'profile.updated' }).expect(200)).body.items[0];
    expect(log.changes.fields).toEqual(expect.arrayContaining(['theme', 'personalPhone']));
    expect(JSON.stringify(log)).not.toContain('+966501234567');
  });

  it('is only for the signed-in person: 401 without a session, and each person sees their own data', async () => {
    await request(t.app.getHttpServer()).get('/api/me/profile').expect(401);
    await request(t.app.getHttpServer()).put('/api/me/profile').send({ theme: 'dark' }).expect(401);
    const a = await signedIn();
    const b = await signedIn();
    await a.agent.put('/api/me/profile').send({ theme: 'dark' }).expect(200);
    expect((await b.agent.get('/api/me/profile').expect(200)).body.preferences.theme).toBe('system');
  });
});
