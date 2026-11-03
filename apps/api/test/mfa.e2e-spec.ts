import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { InvitationService } from '../src/core/auth/application/invitation.service';
import { nextIp } from './factories/factories';
import { codeFor } from './helpers/totp';
import { useTestApp } from './setup/test-app';

const tokenOf = (url: string): string => url.split('/enroll/')[1] as string;

describe('Invitation and enrollment of the authenticator app (FR-16)', () => {
  const t = useTestApp();
  const server = () => t.app.getHttpServer();

  async function invited() {
    const user = await t.factories.user({ enrolled: false });
    const invite = await t.app.get(InvitationService).invite(user.id);
    return { user, token: tokenOf(invite.enrollmentUrl as string), invite };
  }

  it('e-mails an activation link, then the employee scans the QR code, confirms the first code and gets backup codes', async () => {
    const { user, token } = await invited();
    expect(t.mail.sent).toHaveLength(1);
    expect(t.mail.sent[0]?.to).toBe(user.email);
    expect(t.mail.sent[0]?.text).toContain(`/enroll/${token}`);
    const start = await request(server()).get(`/api/mfa/enrollment/${token}`).expect(200);
    expect(start.body).toMatchObject({ email: user.email });
    expect(start.body.otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    const secret = new URL(start.body.otpauthUri).searchParams.get('secret') as string;
    const done = await request(server()).post(`/api/mfa/enrollment/${token}/confirm`).send({ code: codeFor(secret) }).expect(200);
    expect(done.body.backupCodes).toHaveLength(10);
    // From now on the employee signs in with the e-mail and the code.
    await request(server()).post('/api/auth/totp/sign-in').set('x-forwarded-for', nextIp()).send({ email: user.email, code: codeFor(secret, Date.now() + 30_000) }).expect(200);
  });

  it('rejects a wrong first code and keeps the link usable', async () => {
    const { token } = await invited();
    const start = await request(server()).get(`/api/mfa/enrollment/${token}`).expect(200);
    await request(server()).post(`/api/mfa/enrollment/${token}/confirm`).send({ code: '000000' }).expect(400);
    const secret = new URL(start.body.otpauthUri).searchParams.get('secret') as string;
    await request(server()).post(`/api/mfa/enrollment/${token}/confirm`).send({ code: codeFor(secret) }).expect(200);
  });

  it('works once: a used link, an expired link, an unknown link and a replaced link all answer 404', async () => {
    const { user, token } = await invited();
    const start = await request(server()).get(`/api/mfa/enrollment/${token}`).expect(200);
    const secret = new URL(start.body.otpauthUri).searchParams.get('secret') as string;
    await request(server()).post(`/api/mfa/enrollment/${token}/confirm`).send({ code: codeFor(secret) }).expect(200);
    await request(server()).get(`/api/mfa/enrollment/${token}`).expect(404);

    const second = await t.factories.user({ enrolled: false });
    const expired = tokenOf((await t.app.get(InvitationService).invite(second.id)).enrollmentUrl as string);
    await t.db.query(`UPDATE enrollment_invites SET expires_at = now() - interval '1 minute' WHERE user_id = $1`, [second.id]);
    await request(server()).get(`/api/mfa/enrollment/${expired}`).expect(404);

    await request(server()).get(`/api/mfa/enrollment/${'x'.repeat(43)}`).expect(404);

    const third = await t.factories.user({ enrolled: false });
    const first = tokenOf((await t.app.get(InvitationService).invite(third.id)).enrollmentUrl as string);
    const newer = tokenOf((await t.app.get(InvitationService).invite(third.id)).enrollmentUrl as string);
    await request(server()).get(`/api/mfa/enrollment/${first}`).expect(404);
    await request(server()).get(`/api/mfa/enrollment/${newer}`).expect(200);
    expect(user.id).toBeTruthy();
  });

  it('never stores the link token, only its hash', async () => {
    const { token } = await invited();
    const rows = await t.db.query('SELECT token_hash FROM enrollment_invites');
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(rows[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('stores the secret encrypted and the backup codes hashed', async () => {
    const { token } = await invited();
    const start = await request(server()).get(`/api/mfa/enrollment/${token}`).expect(200);
    const secret = new URL(start.body.otpauthUri).searchParams.get('secret') as string;
    const done = await request(server()).post(`/api/mfa/enrollment/${token}/confirm`).send({ code: codeFor(secret) }).expect(200);
    const stored = JSON.stringify(await t.db.query('SELECT secret_enc FROM authenticators'));
    expect(stored).not.toContain(secret);
    const codes = JSON.stringify(await t.db.query('SELECT code_hash FROM authenticator_backup_codes'));
    for (const code of done.body.backupCodes as string[]) expect(codes).not.toContain(code.replace('-', ''));
  });

  it('first sign-in: typing the e-mail tells the page it is the first time and e-mails the QR link, once per minute (FR-16)', async () => {
    const fresh = await t.factories.user({ enrolled: false });
    const enrolled = await t.factories.user();
    t.mail.sent.length = 0;
    const post = (email: string) => request(server()).post('/api/mfa/identify').send({ email });
    expect((await post(fresh.email).expect(200)).body).toEqual({ firstTime: true, trustedDevicesEnabled: false });
    expect((await post(enrolled.email).expect(200)).body).toEqual({ firstTime: false, trustedDevicesEnabled: false });
    expect((await post('nobody@arweqah.sa').expect(200)).body).toEqual({ firstTime: false, trustedDevicesEnabled: false });
    expect(t.mail.sent.map((m) => m.to)).toEqual([fresh.email]);
    expect((await post(fresh.email).expect(200)).body).toEqual({ firstTime: true, trustedDevicesEnabled: false });
    expect(t.mail.sent).toHaveLength(1);
    await post('not-an-email').expect(400);
  });
});
