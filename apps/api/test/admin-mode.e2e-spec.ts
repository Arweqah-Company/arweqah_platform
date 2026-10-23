import { CorePermission } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { generateBackupCodes } from '../src/core/auth/domain/totp';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';

const NEXT_STEP = 30_000;
const IDLE_MINUTES = 30;

describe('Platform admin mode (FR-34)', () => {
  const t = useTestApp();

  async function admin() {
    const user = await t.factories.user({ grants: [{ key: CorePermission.AdminModeUse, scope: 'all' }] });
    return { user, agent: await t.factories.signIn(user) };
  }
  const nextCode = (secret: string, steps = 1) => codeFor(secret, Date.now() + steps * NEXT_STEP);
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('is off by default for everyone, offered only to those with an administrative capability', async () => {
    const { agent } = await admin();
    expect((await agent.get('/api/me').expect(200)).body.adminMode).toEqual({ available: true, active: false, expiresAt: null });
    const employee = await t.factories.user({ grants: [] });
    const plain = await t.factories.signIn(employee);
    expect((await plain.get('/api/me').expect(200)).body.adminMode).toEqual({ available: false, active: false, expiresAt: null });
    expect((await plain.post('/api/admin-mode/activate').send({ code: nextCode(employee.secret) }).expect(403)).body.code).toBe('ADMIN_MODE_NOT_ALLOWED');
  });

  it('turns on with a fresh code, opens the admin routes, and turns off again', async () => {
    const { user, agent } = await admin();
    expect((await agent.get('/api/test-admin-probe').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    const on = await agent.post('/api/admin-mode/activate').send({ code: nextCode(user.secret) }).expect(200);
    expect(on.body).toMatchObject({ available: true, active: true });
    expect(new Date(on.body.expiresAt).getTime()).toBeGreaterThan(Date.now() + (IDLE_MINUTES - 1) * 60_000);
    await agent.get('/api/test-admin-probe').expect(200);
    expect((await agent.get('/api/me').expect(200)).body.adminMode.active).toBe(true);
    await agent.post('/api/admin-mode/deactivate').expect(204);
    expect((await agent.get('/api/test-admin-probe').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    expect((await agent.get('/api/me').expect(200)).body.adminMode).toMatchObject({ active: false, expiresAt: null });
  });

  it('needs a code that was never used: the code just used to sign in, or to turn it on, is refused without counting as a failed attempt', async () => {
    const { user, agent } = await admin();
    // The sign-in used the current step.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      expect((await agent.post('/api/admin-mode/activate').send({ code: codeFor(user.secret) }).expect(422)).body.code).toBe('CODE_ALREADY_USED');
    }
    await agent.post('/api/admin-mode/activate').send({ code: nextCode(user.secret) }).expect(200);
    await agent.post('/api/admin-mode/deactivate').expect(204);
    // Every activation is a new proof: the same code again is refused until its step has passed.
    await agent.post('/api/admin-mode/activate').send({ code: nextCode(user.secret) }).expect(422);
  });

  it('rejects wrong codes and backup codes, and locks after five wrong attempts', async () => {
    const { user, agent } = await admin();
    expect((await agent.post('/api/admin-mode/activate').send({ code: '000000' }).expect(400)).body.code).toBe('INVALID_CODE');
    const [backup] = generateBackupCodes(1);
    await agent.post('/api/admin-mode/activate').send({ code: backup }).expect(400);
    for (let attempt = 0; attempt < 4; attempt += 1) await agent.post('/api/admin-mode/activate').send({ code: '000000' }).expect(400);
    expect((await agent.post('/api/admin-mode/activate').send({ code: nextCode(user.secret) }).expect(400)).body.code).toBe('AUTHENTICATOR_LOCKED');
    expect((await agent.get('/api/test-admin-probe').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
  });

  it('switches itself off after the idle time, and every admin action restarts the clock', async () => {
    const { user, agent } = await admin();
    await agent.post('/api/admin-mode/activate').send({ code: nextCode(user.secret) }).expect(200);
    await t.db.query(`UPDATE auth_sessions SET admin_mode_last_activity_at = now() - interval '29 minutes' WHERE user_id = $1`, [user.id]);
    await agent.get('/api/test-admin-probe').expect(200);
    const renewed: { idle: number }[] = await t.db.query(`SELECT extract(epoch FROM now() - admin_mode_last_activity_at) AS idle FROM auth_sessions WHERE user_id = $1`, [user.id]);
    expect(Number(renewed[0]?.idle)).toBeLessThan(60);
    await t.db.query(`UPDATE auth_sessions SET admin_mode_last_activity_at = now() - interval '31 minutes' WHERE user_id = $1`, [user.id]);
    expect((await agent.get('/api/me').expect(200)).body.adminMode).toMatchObject({ available: true, active: false });
    expect((await agent.get('/api/test-admin-probe').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    await wait(300);
    const actions: { action: string }[] = await t.db.query(`SELECT action FROM audit_logs WHERE action LIKE 'auth.admin_mode.%' ORDER BY created_at`);
    expect(actions.map((a) => a.action)).toEqual(['auth.admin_mode.enabled', 'auth.admin_mode.expired']);
  });

  it('belongs to one session: a second sign-in of the same person starts with it off', async () => {
    const { user, agent } = await admin();
    await agent.post('/api/admin-mode/activate').send({ code: nextCode(user.secret) }).expect(200);
    await t.factories.freshStep(user);
    const other = await t.factories.signIn(user);
    expect((await other.get('/api/me').expect(200)).body.adminMode.active).toBe(false);
    await other.get('/api/test-admin-probe').expect(403);
    await agent.get('/api/test-admin-probe').expect(200);
  });

  it('offers nothing before the code of the authenticator app is verified, and records turning it on and off in the audit log', async () => {
    const { user, agent } = await admin();
    await agent.post('/api/admin-mode/activate').send({ code: nextCode(user.secret) }).expect(200);
    await agent.post('/api/admin-mode/deactivate').expect(204);
    await t.factories.forgetCode(user);
    expect((await agent.get('/api/me').expect(200)).body.adminMode).toEqual({ available: false, active: false, expiresAt: null });
    await agent.get('/api/admin-mode').expect(403);
    await wait(300);
    const actions: { action: string; actor_id: string }[] = await t.db.query(`SELECT action, actor_id FROM audit_logs WHERE action LIKE 'auth.admin_mode.%' ORDER BY created_at`);
    expect(actions).toEqual([
      { action: 'auth.admin_mode.enabled', actor_id: user.id },
      { action: 'auth.admin_mode.disabled', actor_id: user.id },
    ]);
  });

  it('rejects malformed input and anonymous callers', async () => {
    const { agent } = await admin();
    await agent.post('/api/admin-mode/activate').send({ code: '12 34' }).expect(400);
    await agent.post('/api/admin-mode/activate').send({ code: '123456', extra: 1 }).expect(400);
    const anonymous = (await import('supertest')).default(t.app.getHttpServer());
    await anonymous.post('/api/admin-mode/activate').send({ code: '123456' }).expect(401);
    await anonymous.get('/api/test-admin-probe').expect(401);
  });
});
