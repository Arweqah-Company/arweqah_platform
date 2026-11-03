import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { nextIp } from './factories/factories';
import { codeFor } from './helpers/totp';
import { DEMO_PERMISSION, useTestApp } from './setup/test-app';

const ORIGIN = 'http://localhost:4173';

describe('Sign-in with e-mail and authenticator code (FR-01, FR-23)', () => {
  const t = useTestApp();
  const signIn = (email: string, code: string, ip = nextIp()) =>
    request(t.app.getHttpServer()).post('/api/auth/totp/sign-in').set('x-forwarded-for', ip).send({ email, code });

  it('signs in with the e-mail and the app code, and returns the profile, and the permissions are read apart (FR-88)', async () => {
    const user = await t.factories.user({ grants: [{ key: DEMO_PERMISSION, scope: 'company' }] });
    const agent = await t.factories.signIn(user);
    const me = await agent.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ email: user.email, authenticatorEnabled: true, mfaVerified: true });
    expect(me.body.permissions).toBeUndefined();
    const access = await agent.get('/api/me/access').expect(200);
    expect(access.body.grants).toEqual(expect.arrayContaining([expect.objectContaining({ key: DEMO_PERMISSION, scope: 'company' })]));
  });

  it('sets the session cookie as HttpOnly and SameSite=Lax', async () => {
    const user = await t.factories.user();
    const res = await signIn(user.email, codeFor(user.secret)).expect(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it('answers every failure in the same way: unknown e-mail, no app linked, wrong code, deactivated account', async () => {
    const enrolled = await t.factories.user();
    const notEnrolled = await t.factories.user({ enrolled: false });
    const inactive = await t.factories.user({ active: false });
    const attempts = [
      await signIn('nobody@arweqah.sa', '123456'),
      await signIn(notEnrolled.email, codeFor(notEnrolled.secret)),
      await signIn(enrolled.email, '000000'),
      await signIn(inactive.email, codeFor(inactive.secret)),
    ];
    for (const res of attempts) {
      expect(res.status).toBe(401);
      expect(res.body.message).toBe(attempts[0]?.body.message);
    }
  });

  it('has no password sign-in, no password reset and no self sign-up', async () => {
    const server = t.app.getHttpServer();
    for (const path of ['/api/auth/sign-in/email', '/api/auth/sign-up/email', '/api/auth/forget-password', '/api/auth/reset-password']) {
      const res = await request(server).post(path).set('x-forwarded-for', nextIp()).send({ email: 'new@arweqah.sa', password: 'Some-Passw0rd-1', name: 'New' });
      expect(res.status, path).toBeGreaterThanOrEqual(400);
    }
    const created = await t.db.query(`SELECT COUNT(*)::int AS n FROM users WHERE email = 'new@arweqah.sa'`);
    expect(created[0].n).toBe(0);
  });

  it('accepts a code only once (a replayed code is refused)', async () => {
    const user = await t.factories.user();
    const code = codeFor(user.secret);
    await signIn(user.email, code).expect(200);
    await signIn(user.email, code).expect(401);
  });

  it('locks the account after five wrong codes, even for the right code', async () => {
    const user = await t.factories.user();
    for (let i = 0; i < 5; i += 1) await signIn(user.email, '000000').expect(401);
    const right = await signIn(user.email, codeFor(user.secret));
    expect(right.status).toBe(401);
    await t.factories.freshStep(user);
    await signIn(user.email, codeFor(user.secret)).expect(200);
  });

  it('accepts a backup code once', async () => {
    const user = await t.factories.user();
    const codes = ['ABCDE-FGHIJ', 'KLMNO-PQRST'];
    for (const code of codes) {
      await t.db.query('INSERT INTO authenticator_backup_codes (user_id, code_hash) VALUES ($1, encode(digest($2, \'sha256\'), \'hex\'))', [user.id, code.replace('-', '')]);
    }
    await signIn(user.email, 'ABCDE-FGHIJ').expect(200);
    await signIn(user.email, 'ABCDE-FGHIJ').expect(401);
    await signIn(user.email, 'klmno-pqrst').expect(200);
  });

  it('rate-limits repeated attempts from one address (429)', async () => {
    const ip = nextIp();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i += 1) statuses.push((await signIn('nobody@arweqah.sa', '123456', ip)).status);
    expect(statuses).toContain(429);
  });

  it('sign-out invalidates the session', async () => {
    const agent = await t.factories.signIn(await t.factories.user());
    await agent.post('/api/auth/sign-out').set('origin', ORIGIN).expect(200);
    await agent.get('/api/me').expect(401);
  });
});

describe('The code is required in every session (FR-13, FR-16)', () => {
  const t = useTestApp();

  it('blocks every route but the code step while the session is not code-verified (as after Microsoft sign-in)', async () => {
    const user = await t.factories.user({ grants: [{ key: 'roles.view', scope: 'all' }] });
    const agent = await t.factories.signIn(user);
    await agent.get('/api/roles').expect(200);
    await t.factories.forgetCode(user);
    const blocked = await agent.get('/api/roles');
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('MFA_REQUIRED');
    const me = await agent.get('/api/me').expect(200);
    expect(me.body).toMatchObject({ authenticatorEnabled: true, mfaVerified: false });
  });

  it('opens the session once the right code is entered, and refuses a wrong one', async () => {
    const user = await t.factories.user({ grants: [{ key: 'roles.view', scope: 'all' }] });
    const agent = await t.factories.signIn(user);
    await t.factories.forgetCode(user);
    await t.factories.freshStep(user);
    await agent.post('/api/mfa/verify').send({ code: '000000' }).expect(400);
    await agent.get('/api/roles').expect(403);
    await agent.post('/api/mfa/verify').send({ code: codeFor(user.secret) }).expect(204);
    await agent.get('/api/roles').expect(200);
  });

  it('lets someone who came in with Microsoft and has no app yet link one: QR secret, first code, backup codes', async () => {
    const user = await t.factories.user({ grants: [{ key: 'roles.view', scope: 'all' }] });
    const agent = await t.factories.signIn(user);
    // The same state Microsoft sign-in leaves: a session, no authenticator, code not entered.
    await t.db.query('DELETE FROM authenticators WHERE user_id = $1', [user.id]);
    await t.factories.forgetCode(user);
    await agent.get('/api/roles').expect(403);
    const start = await agent.post('/api/mfa/enroll').expect(200);
    expect(start.body.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    await agent.post('/api/mfa/enroll/confirm').send({ code: '000000' }).expect(400);
    const secret = new URL(start.body.otpauthUri).searchParams.get('secret') as string;
    const done = await agent.post('/api/mfa/enroll/confirm').send({ code: codeFor(secret) }).expect(200);
    expect(done.body.backupCodes).toHaveLength(10);
    await agent.get('/api/roles').expect(200);
    await agent.post('/api/mfa/enroll').expect(422);
  });
});
