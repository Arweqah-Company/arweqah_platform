import { CorePermission } from '@arweqah-platform/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { nextIp } from './factories/factories';
import { useTestApp } from './setup/test-app';

describe('Authentication (FR-01)', () => {
  const t = useTestApp();

  it('signs in with email and password and returns the profile with permissions', async () => {
    const user = await t.factories.user({ grants: [{ key: CorePermission.UsersView, scope: 'company' }] });
    const agent = await t.factories.signIn(user);
    const me = await agent.get('/api/me').expect(200);
    expect(me.body.email).toBe(user.email);
    expect(me.body.permissions).toEqual([{ key: 'users.view', scope: 'company' }]);
  });

  it('sets the session cookie as HttpOnly and SameSite=Lax', async () => {
    const user = await t.factories.user();
    const res = await request(t.app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .set('x-forwarded-for', nextIp())
      .send({ email: user.email, password: user.password })
      .expect(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('gives the same generic error for a wrong password and an unknown email', async () => {
    const user = await t.factories.user();
    const server = t.app.getHttpServer();
    const wrong = await request(server).post('/api/auth/sign-in/email').set('x-forwarded-for', nextIp())
      .send({ email: user.email, password: 'Wrong-Password-1' });
    const unknown = await request(server).post('/api/auth/sign-in/email').set('x-forwarded-for', nextIp())
      .send({ email: 'nobody@test.local', password: 'Wrong-Password-1' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('refuses self sign-up: accounts are created by administrators only', async () => {
    const res = await request(t.app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .set('x-forwarded-for', nextIp())
      .send({ email: 'new@test.local', password: 'Some-Passw0rd-1', name: 'New' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    const count = await t.db.query(`SELECT COUNT(*)::int AS n FROM users WHERE email = 'new@test.local'`);
    expect(count[0].n).toBe(0);
  });

  it('rate-limits repeated sign-in attempts from one address (429)', async () => {
    const ip = nextIp();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(t.app.getHttpServer()).post('/api/auth/sign-in/email').set('x-forwarded-for', ip)
        .send({ email: 'nobody@test.local', password: 'Wrong-Password-1' });
      statuses.push(res.status);
    }
    expect(statuses).toContain(429);
  });

  it('refuses sign-in for a deactivated account', async () => {
    const user = await t.factories.user();
    await t.db.query('UPDATE users SET is_active = false WHERE id = $1', [user.id]);
    const res = await request(t.app.getHttpServer()).post('/api/auth/sign-in/email').set('x-forwarded-for', nextIp())
      .send({ email: user.email, password: user.password });
    expect(res.status).not.toBe(200);
  });

  it('sign-out invalidates the session', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    await agent.post('/api/auth/sign-out').set('origin', 'http://localhost:4173').expect(200);
    await agent.get('/api/me').expect(401);
  });
});
