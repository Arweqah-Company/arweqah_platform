import { CorePermission } from '@arweqah-platform/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { SecuritySettingsService } from '../src/core/auth/application/security-settings.service';
import type { TestAgent, TestUser } from './factories/factories';
import { TASK_EMPLOYEE_GRANTS } from './factories/task-grants';
import { useTestApp } from './setup/test-app';

const START = { key: CorePermission.ImpersonationStart, scope: 'all' as const };
const ADMIN_MODE = { key: CorePermission.AdminModeUse, scope: 'all' as const };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Sign in as another employee (FR-85)', () => {
  const t = useTestApp();

  async function setting(key: string, value: number): Promise<void> {
    await t.db.query('INSERT INTO security_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
    t.app.get(SecuritySettingsService).invalidate();
  }
  const enable = () => setting('impersonationEnabled', 1);

  /** A platform administrator who may sign in as others (admin mode on), and an ordinary employee with tasks. */
  async function world() {
    const org = await t.factories.org();
    const admin = await t.factories.user({ grants: [ADMIN_MODE, START] });
    const target = await t.factories.user({ unit: org.unitA, grants: TASK_EMPLOYEE_GRANTS });
    return { admin, target, adminAgent: await t.factories.signInAdminMode(admin) };
  }
  const meOf = async (agent: TestAgent) => (await agent.get('/api/me').expect(200)).body;
  const start = (agent: TestAgent, target: TestUser) => agent.post(`/api/impersonation/${target.id}`);
  const auditActions = async (): Promise<string[]> => {
    await wait(300);
    const rows: { action: string }[] = await t.db.query('SELECT action FROM audit_logs ORDER BY seq');
    return rows.map((r) => r.action);
  };

  it('is switched off by default: starting answers 422 IMPERSONATION_DISABLED and /me says so', async () => {
    const { target, adminAgent } = await world();
    expect((await start(adminAgent, target).expect(422)).body.code).toBe('IMPERSONATION_DISABLED');
    expect((await meOf(adminAgent)).impersonationEnabled).toBe(false);
  });

  it('needs the key and admin mode: 403 for an employee, ADMIN_MODE_REQUIRED outside admin mode', async () => {
    await enable();
    const { admin, target } = await world();
    const employee = await t.factories.signIn(await t.factories.user({ grants: [] }));
    await start(employee, target).expect(403);
    const outside = await t.factories.signIn(admin);
    expect((await start(outside, target).expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
  });

  it('works as the employee without a code, and going back restores the administrator', async () => {
    await enable();
    const { admin, target, adminAgent } = await world();
    await start(adminAgent, target).expect(204);
    const me = await meOf(adminAgent);
    expect(me).toMatchObject({ id: target.id, mfaVerified: true, impersonationEnabled: true, adminMode: { available: false, active: false } });
    expect(me.impersonation).toMatchObject({ by: { id: admin.id }, idleMinutes: 30 });
    await adminAgent.post('/api/impersonation/stop').expect(204);
    const back = await meOf(adminAgent);
    expect(back.id).toBe(admin.id);
    expect(back.impersonation).toBeNull();
    expect(back.adminMode.active).toBe(true);
  });

  it('refuses oneself, an unknown account and an account that is not active', async () => {
    await enable();
    const { admin, adminAgent } = await world();
    expect((await start(adminAgent, admin).expect(422)).body.code).toBe('IMPERSONATION_TARGET_INVALID');
    await adminAgent.post('/api/impersonation/00000000-0000-4000-8000-000000000000').expect(404);
    await adminAgent.post('/api/impersonation/not-a-uuid').expect(400);
    const off = await t.factories.user({ active: false });
    expect((await start(adminAgent, off).expect(422)).body.code).toBe('IMPERSONATION_TARGET_INVALID');
  });

  it('allows signing in as another administrator, but without admin mode', async () => {
    await enable();
    const { adminAgent } = await world();
    const other = await t.factories.user({ grants: [ADMIN_MODE, START] });
    await start(adminAgent, other).expect(204);
    expect((await meOf(adminAgent)).adminMode.available).toBe(false);
    await adminAgent.get('/api/test-admin-probe').expect(403);
  });

  it('forbids what must stay with the person: nesting, admin mode, sessions, security settings, roles', async () => {
    await enable();
    const { target, adminAgent } = await world();
    await start(adminAgent, target).expect(204);
    const refused = [
      () => adminAgent.post(`/api/impersonation/${target.id}`),
      () => adminAgent.post('/api/admin-mode/activate').send({ code: '123456' }),
      () => adminAgent.delete('/api/me/sessions'),
      () => adminAgent.put('/api/security-settings').send({}),
      () => adminAgent.put(`/api/employees/${target.employeeId}/roles`).send({ roleIds: [] }),
      () => adminAgent.post(`/api/employees/${target.employeeId}/reset-authenticator`),
    ];
    for (const call of refused) expect((await call().expect(403)).body.code).toBe('IMPERSONATION_FORBIDDEN');
  });

  it('does the everyday work as the employee, and every audit entry names the administrator', async () => {
    await enable();
    const { admin, target, adminAgent } = await world();
    await start(adminAgent, target).expect(204);
    const task = await adminAgent.post('/api/tasks').send({ title: 'مهمة من الدعم' }).expect(201);
    expect(task.body.creator.id).toBe(target.id);
    await adminAgent.post('/api/impersonation/stop').expect(204);
    await wait(300);
    const rows: { actor_id: string; changes: Record<string, unknown> | null }[] = await t.db.query(`SELECT actor_id, changes FROM audit_logs WHERE action = 'task.created'`);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_id: target.id, changes: { impersonatedBy: admin.id } });
  });

  it('writes started and ended for the administrator, no sign-in entry for the employee, and tells the employee afterwards', async () => {
    await enable();
    const { admin, target, adminAgent } = await world();
    const before: { seq: string }[] = await t.db.query('SELECT COALESCE(max(seq), 0) AS seq FROM audit_logs');
    await start(adminAgent, target).expect(204);
    await adminAgent.post('/api/impersonation/stop').expect(204);
    await wait(300);
    const rows: { action: string; actor_id: string; entity_id: string; changes: Record<string, unknown> | null }[] = await t.db.query(
      `SELECT action, actor_id, entity_id, changes FROM audit_logs WHERE seq > $1 AND (action LIKE 'impersonation.%' OR (action = 'auth.sign_in' AND actor_id = $2)) ORDER BY seq`,
      [before[0]?.seq, target.id],
    );
    await wait(300);
    expect(rows.map((r) => r.action)).toEqual(['impersonation.started', 'impersonation.ended']);
    expect(rows.every((r) => r.actor_id === admin.id && r.entity_id === target.id)).toBe(true);
    expect(rows[1]?.changes).toMatchObject({ reason: 'manual' });
    const notices = (await (await t.factories.signIn(target)).get('/api/notifications').expect(200)).body.items as { titleEn: string }[];
    expect(notices.map((n) => n.titleEn)).toContain('A platform administrator worked in your account');
    expect(await auditActions()).not.toContain('impersonation.denied');
  });

  it('ends after the idle minutes: the session answers IMPERSONATION_ENDED and only going back works', async () => {
    await enable();
    const { admin, target, adminAgent } = await world();
    await start(adminAgent, target).expect(204);
    await t.db.query(`UPDATE auth_sessions SET impersonation_last_activity_at = now() - interval '31 minutes' WHERE user_id = $1 AND impersonated_by_user_id IS NOT NULL`, [target.id]);
    expect((await adminAgent.get('/api/tasks').expect(403)).body.code).toBe('IMPERSONATION_ENDED');
    await adminAgent.post('/api/impersonation/stop').expect(204);
    expect((await meOf(adminAgent)).id).toBe(admin.id);
    const ended: { changes: { reason: string } }[] = await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'impersonation.ended'`);
    expect(ended[0]?.changes.reason).toBe('idle');
  });

  it('counts requests as activity, so a busy session does not end', async () => {
    await enable();
    const { target, adminAgent } = await world();
    await start(adminAgent, target).expect(204);
    await t.db.query(`UPDATE auth_sessions SET impersonation_last_activity_at = now() - interval '29 minutes' WHERE user_id = $1 AND impersonated_by_user_id IS NOT NULL`, [target.id]);
    await adminAgent.get('/api/tasks').expect(200);
    const rows: { idle: string }[] = await t.db.query(`SELECT extract(epoch FROM now() - impersonation_last_activity_at) AS idle FROM auth_sessions WHERE impersonated_by_user_id IS NOT NULL`);
    expect(Number(rows[0]?.idle)).toBeLessThan(60);
  });

  it('switching the feature off ends the running sessions at once and hides the button', async () => {
    await enable();
    const { admin, target, adminAgent } = await world();
    await start(adminAgent, target).expect(204);
    await setting('impersonationEnabled', 0);
    expect((await adminAgent.get('/api/me').expect(403)).body.code).toBe('IMPERSONATION_ENDED');
    expect((await adminAgent.get('/api/tasks').expect(403)).body.code).toBe('IMPERSONATION_ENDED');
    await adminAgent.post('/api/impersonation/stop').expect(204);
    expect((await meOf(adminAgent)).id).toBe(admin.id);
    expect((await meOf(adminAgent)).impersonationEnabled).toBe(false);
    expect((await start(adminAgent, target).expect(422)).body.code).toBe('IMPERSONATION_DISABLED');
  });

  it('ends the session of the employee when the administrator’s own session ends', async () => {
    await enable();
    const { target, adminAgent } = await world();
    await start(adminAgent, target).expect(204);
    await t.db.query(`DELETE FROM auth_sessions WHERE impersonated_by_user_id IS NULL AND id IN (SELECT impersonator_session_id FROM auth_sessions WHERE impersonated_by_user_id IS NOT NULL)`);
    await adminAgent.get('/api/me').expect(401);
  });

  it('cannot be reached over HTTP: the session endpoints of the sign-in library are server-only', async () => {
    const http = request(t.app.getHttpServer());
    for (const path of ['/api/auth/impersonation/open', '/api/auth/impersonation/return']) {
      expect((await http.post(path).send({})).status).toBe(404);
    }
  });

  it('settings: the two numbers are validated and saved with the other security settings', async () => {
    const admin = await t.factories.user({ grants: [ADMIN_MODE, { key: CorePermission.SecuritySettingsEdit, scope: 'all' }, { key: CorePermission.SecuritySettingsView, scope: 'all' }] });
    const agent = await t.factories.signInAdminMode(admin);
    const body = { trustedDeviceDays: 0, requestsPerMinute: 600, impersonationEnabled: 1, impersonationIdleMinutes: 45 };
    await agent.put('/api/security-settings').send({ ...body, impersonationIdleMinutes: 1 }).expect(400);
    await agent.put('/api/security-settings').send({ ...body, impersonationEnabled: 2 }).expect(400);
    expect((await agent.put('/api/security-settings').send(body).expect(200)).body).toMatchObject({ impersonationEnabled: 1, impersonationIdleMinutes: 45 });
  });
});
