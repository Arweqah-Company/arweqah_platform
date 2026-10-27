import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { ExternalServiceError } from '../src/common/domain/domain-error';
import { EmailLogRepository } from '../src/core/notifications/domain/email-log.repository';
import { LoggedMailSender } from '../src/core/notifications/infrastructure/logged-mail.sender';
import type { MailTransport } from '../src/core/notifications/application/mail-transport';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const okSmtp = { send: async () => ({ messageId: '<id-1@arweqah.sa>', response: '250 2.0.0 OK' }) } as unknown as MailTransport;
const brokenSmtp = { send: async () => { throw new ExternalServiceError('Email delivery failed', { cause: '535 5.7.139 Authentication unsuccessful' }); } } as unknown as MailTransport;

describe('Sent e-mail log (FR-26)', () => {
  const t = useTestApp();
  const logs = () => t.app.get(EmailLogRepository);
  const mail = { to: 'a@arweqah.sa', subject: 'Activate', text: 'secret-link-body', purpose: 'activation' as const };

  async function viewer() {
    return t.factories.signInAdminMode(await t.factories.user({ grants: [ADMIN_MODE_GRANT, { key: 'notifications.email_log', scope: 'all' }] }));
  }

  it('records a sent e-mail with the server acknowledgement and never stores the body', async () => {
    await new LoggedMailSender(okSmtp, logs()).send(mail);
    const res = await (await viewer()).get('/api/email-logs').expect(200);
    expect(res.body.items[0]).toMatchObject({ to: 'a@arweqah.sa', subject: 'Activate', purpose: 'activation', status: 'sent', providerResponse: '250 2.0.0 OK', error: null });
    expect(JSON.stringify(res.body)).not.toContain('secret-link-body');
  });

  it('records a failed e-mail with the reason and still raises the error', async () => {
    await expect(new LoggedMailSender(brokenSmtp, logs()).send(mail)).rejects.toThrow('Email delivery failed');
    const res = await (await viewer()).get('/api/email-logs').query({ status: 'failed' }).expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ status: 'failed', error: '535 5.7.139 Authentication unsuccessful' });
  });

  it('filters by status and address, validates the query, and is limited to people with the permission', async () => {
    await new LoggedMailSender(okSmtp, logs()).send(mail);
    await new LoggedMailSender(okSmtp, logs()).send({ ...mail, to: 'b@arweqah.sa' });
    const agent = await viewer();
    expect((await agent.get('/api/email-logs').query({ to: 'b@' }).expect(200)).body.total).toBe(1);
    expect((await agent.get('/api/email-logs').query({ status: 'failed' }).expect(200)).body.total).toBe(0);
    await agent.get('/api/email-logs').query({ status: 'bogus' }).expect(400);
    const other = await t.factories.signIn(await t.factories.user());
    await other.get('/api/email-logs').expect(403);
    await request(t.app.getHttpServer()).get('/api/email-logs').expect(401);
  });

  it('searches the subject or the address and filters by date range', async () => {
    await new LoggedMailSender(okSmtp, logs()).send(mail);
    await new LoggedMailSender(okSmtp, logs()).send({ ...mail, to: 'b@arweqah.sa', subject: 'Payslip' });
    const agent = await viewer();
    const total = async (query: Record<string, unknown>) => (await agent.get('/api/email-logs').query(query).expect(200)).body.total as number;
    expect(await total({ search: 'payslip' })).toBe(1);
    expect(await total({ search: 'b@arweqah' })).toBe(1);
    expect(await total({ search: 'nothing' })).toBe(0);
    expect(await total({ search: 'activate', to: 'a@' })).toBe(1);
    const today = new Date().toISOString().slice(0, 10);
    expect(await total({ from: today, until: today })).toBe(2);
    expect(await total({ from: '2000-01-01', until: '2000-01-02' })).toBe(0);
    await agent.get('/api/email-logs').query({ from: 'x' }).expect(400);
  });
});
