import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { SecuritySettingsService } from '../src/core/auth/application/security-settings.service';
import { nextIp } from './factories/factories';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';

describe('Sign-in code by e-mail, and a remembered device (FR-164)', () => {
  const t = useTestApp();
  const server = () => t.app.getHttpServer();
  beforeEach(() => t.app.get(SecuritySettingsService).invalidate());

  const sendTo = (email: string) => request(server()).post('/api/mfa/email-code').send({ email });
  const signIn = (email: string, code: string, extra: object = {}) =>
    request(server()).post('/api/auth/totp/sign-in').set('x-forwarded-for', nextIp()).send({ email, code, method: 'email', ...extra });
  /** The six digits of the last e-mail sent. */
  const lastCode = (): string => /\b(\d{6})\b/.exec(t.mail.sent.at(-1)?.text ?? '')?.[1] as string;
  const setDays = async (days: number) => {
    await t.db.query(`INSERT INTO security_settings (key, value) VALUES ('trustedDeviceDays', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [days]);
    t.app.get(SecuritySettingsService).invalidate();
  };

  it('e-mails a six-digit code to the person and signs them in with it, once', async () => {
    const user = await t.factories.user();
    await sendTo(user.email).expect(204);
    expect(t.mail.sent).toHaveLength(1);
    expect(t.mail.sent[0]).toMatchObject({ to: user.email, purpose: 'sign_in' });
    const code = lastCode();
    expect(code).toMatch(/^\d{6}$/);
    const agent = request.agent(server());
    await agent.post('/api/auth/totp/sign-in').set('x-forwarded-for', nextIp()).send({ email: user.email, code, method: 'email' }).expect(200);
    expect(((await agent.get('/api/me').expect(200)).body as { mfaVerified: boolean }).mfaVerified).toBe(true);
    await signIn(user.email, code).expect(401);
  });

  it('answers 204 and sends nothing for an unknown address, an inactive person and someone with no app linked yet', async () => {
    await sendTo('nobody@arweqah.sa').expect(204);
    const inactive = await t.factories.user();
    await t.db.query('UPDATE users SET is_active = false WHERE id = $1', [inactive.id]);
    await sendTo(inactive.email).expect(204);
    const fresh = await t.factories.user({ enrolled: false });
    await sendTo(fresh.email).expect(204);
    expect(t.mail.sent).toHaveLength(0);
    await request(server()).post('/api/mfa/email-code').send({ email: 'not-an-email' }).expect(400);
  });

  it('asks one minute between two codes, and the new code replaces the old one', async () => {
    const user = await t.factories.user();
    await sendTo(user.email).expect(204);
    const first = lastCode();
    await sendTo(user.email).expect(204);
    expect(t.mail.sent).toHaveLength(1);
    await t.db.query(`UPDATE email_login_codes SET created_at = now() - interval '2 minutes' WHERE user_id = $1`, [user.id]);
    await sendTo(user.email).expect(204);
    expect(t.mail.sent).toHaveLength(2);
    const second = lastCode();
    if (second !== first) await signIn(user.email, first).expect(401);
    await t.db.query(`UPDATE email_login_codes SET attempts = 0 WHERE user_id = $1`, [user.id]);
    await signIn(user.email, second).expect(200);
  });

  it('refuses a wrong code, an expired code, and any code after five wrong tries; the app code is not the e-mailed one', async () => {
    const user = await t.factories.user();
    await sendTo(user.email).expect(204);
    const code = lastCode();
    const wrong = code === '000000' ? '111111' : '000000';
    await signIn(user.email, wrong).expect(401);
    await signIn(user.email, codeFor(user.secret, Date.now() + 30_000)).expect(401);
    await t.db.query(`UPDATE email_login_codes SET expires_at = now() - interval '1 second' WHERE user_id = $1`, [user.id]);
    await signIn(user.email, code).expect(401);

    await t.db.query(`UPDATE email_login_codes SET created_at = now() - interval '2 minutes' WHERE user_id = $1`, [user.id]);
    await sendTo(user.email).expect(204);
    const fresh = lastCode();
    for (let i = 0; i < 5; i += 1) await signIn(user.email, wrong).expect(401);
    await signIn(user.email, fresh).expect(401);
  });

  it('a wrong e-mailed code does not lock the authenticator app', async () => {
    const user = await t.factories.user();
    await sendTo(user.email).expect(204);
    for (let i = 0; i < 6; i += 1) await signIn(user.email, '000000').expect(401);
    await t.factories.freshStep(user);
    await request(server()).post('/api/auth/totp/sign-in').set('x-forwarded-for', nextIp()).send({ email: user.email, code: codeFor(user.secret, Date.now() + 30_000) }).expect(200);
  });

  it('after Microsoft: sends the code to the signed-in person and verifies the session with it; refuses without a session', async () => {
    const user = await t.factories.user();
    await request(server()).post('/api/mfa/email-code/me').expect(401);
    const agent = await t.factories.signIn(user);
    await t.factories.forgetCode(user);
    await agent.post('/api/mfa/email-code/me').expect(204);
    expect(t.mail.sent.at(-1)?.to).toBe(user.email);
    await agent.post('/api/mfa/verify').send({ code: '000000', method: 'email' }).expect(400);
    await agent.post('/api/mfa/verify').send({ code: lastCode(), method: 'email' }).expect(204);
    expect(((await agent.get('/api/me').expect(200)).body as { mfaVerified: boolean }).mfaVerified).toBe(true);
  });

  describe('remember this device on the e-mail sign-in', () => {
    const cookieOf = (res: request.Response): string => /arweqah_device=[^;]+/.exec(String(res.headers['set-cookie']))?.[0] as string;
    const trustedSignIn = (email: string, cookie?: string) => {
      const req = request(server()).post('/api/auth/totp/trusted-sign-in').set('x-forwarded-for', nextIp());
      return (cookie ? req.set('Cookie', cookie) : req).send({ email });
    };

    it('signs in with the e-mail alone on a browser the person trusted, and not on another one', async () => {
      await setDays(30);
      const user = await t.factories.user();
      await sendTo(user.email).expect(204);
      const remembered = await signIn(user.email, lastCode(), { rememberDevice: true }).expect(200);
      const cookie = cookieOf(remembered);
      expect(cookie).toBeTruthy();

      const agent = request.agent(server());
      await agent.post('/api/auth/totp/trusted-sign-in').set('x-forwarded-for', nextIp()).set('Cookie', cookie).send({ email: user.email }).expect(200);
      expect(((await agent.get('/api/me').expect(200)).body as { mfaVerified: boolean }).mfaVerified).toBe(true);

      await trustedSignIn(user.email).expect(401);
      await trustedSignIn(user.email, 'arweqah_device=not-the-secret').expect(401);
      const stranger = await t.factories.user();
      await trustedSignIn(stranger.email, cookie).expect(401);
      await trustedSignIn('nobody@arweqah.sa', cookie).expect(401);
    });

    it('stops when the administrator sets the days to 0 and when the days end', async () => {
      await setDays(30);
      const user = await t.factories.user();
      await sendTo(user.email).expect(204);
      const cookie = cookieOf(await signIn(user.email, lastCode(), { rememberDevice: true }).expect(200));
      await trustedSignIn(user.email, cookie).expect(200);
      await setDays(0);
      await trustedSignIn(user.email, cookie).expect(401);
      await setDays(30);
      await t.db.query(`UPDATE trusted_devices SET expires_at = now() - interval '1 day' WHERE user_id = $1`, [user.id]);
      await trustedSignIn(user.email, cookie).expect(401);
    });
  });
});
