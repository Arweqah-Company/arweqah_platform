import { CorePermission as P } from '@arweqah-platform/shared';
import { describe, expect, it, vi } from 'vitest';
import { MessageTemplateRepository } from '../src/core/templates/domain/contracts/message-template.repository';
import { TemplateRenderer } from '../src/core/templates/application/services/template-renderer';
import { ADMIN_MODE_GRANT } from './factories/factories';
import { useTestApp } from './setup/test-app';

const part = (title: string, body: string, buttonText = '') => ({ title, preheader: '', buttonText, body });
const invitation = (over: { title?: string; body?: string } = {}) => ({
  ar: part(over.title ?? 'أهلًا {{name}}', over.body ?? '<p>مرحبًا {{name}}</p>', 'ربط'),
  en: part(over.title ?? 'Welcome {{name}}', over.body ?? '<p>Hello {{name}}</p>', 'Link'),
  colors: { band: 'ink', button: 'orange' },
});
const notice = (title: string, body: string) => ({ ar: part(title, body), en: part(title, body) });

const EMAIL_KEYS: string[] = [P.TemplatesEmailView, P.TemplatesEmailEdit, P.TemplatesEmailReset, P.TemplatesEmailTest, P.TemplatesEmailApprove, P.TemplatesEmailSettings];
const NOTE_KEYS: string[] = [P.TemplatesNotificationView, P.TemplatesNotificationEdit, P.TemplatesNotificationReset, P.TemplatesNotificationApprove, P.TemplatesNotificationSettings];
const grant = (keys: string[]) => [ADMIN_MODE_GRANT, ...keys.map((key) => ({ key, scope: 'all' as const }))];

describe('E-mail templates (FR-64)', () => {
  const t = useTestApp();
  const admin = async (keys = EMAIL_KEYS) => t.factories.signInAdminMode(await t.factories.user({ grants: grant(keys) }));
  const renderer = () => t.app.get(TemplateRenderer);

  it('lists the e-mails of the platform with their variables and default wording', async () => {
    const res = await (await admin()).get('/api/templates/email').expect(200);
    const mail = res.body.templates.find((x: { key: string }) => x.key === 'auth.invitation');
    expect(mail).toMatchObject({ status: 'default', area: 'sign_in' });
    expect(mail.variables.map((v: { name: string }) => v.name)).toEqual(['name', 'link']);
    expect(mail.variables.find((v: { name: string }) => v.name === 'link').required).toBe(true);
    expect(res.body.requireApproval).toBe(false);
  });

  it('sends the default wording until it is edited, then the edit, and the default again after a reset', async () => {
    const agent = await admin();
    const before = await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test/enroll/1' });
    expect(before.subject).toBe('Activate your Arweqah account');
    const saved = (await agent.put('/api/templates/email/auth.invitation').send({ content: invitation() }).expect(200)).body;
    expect(saved.status).toBe('custom');
    const after = await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test/enroll/1' });
    expect(after.subject).toBe('Welcome Sara');
    expect(after.html).toContain('Hello Sara');
    expect(after.html).toContain('href="https://x.test/enroll/1"');
    expect(after.text).toContain('https://x.test/enroll/1');
    await agent.post('/api/templates/email/auth.invitation/reset').expect(200).expect((r) => expect(r.body.status).toBe('default'));
    expect((await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test' })).subject).toBe('Activate your Arweqah account');
  });

  it('only fills variables the code can fill, and keeps the activation link (422)', async () => {
    const agent = await admin();
    const put = (content: object) => agent.put('/api/templates/email/auth.invitation').send({ content });
    await put(invitation({ body: '<p>{{name}} {{salary}}</p>' })).expect(422).expect((r) => expect(r.body).toMatchObject({ code: 'TEMPLATE_UNKNOWN_VARIABLE', details: { variables: ['salary'] } }));
    const noLink = { ...invitation(), ar: part('a', '<p>x</p>'), en: part('b', '<p>y</p>') };
    await put(noLink).expect(422).expect((r) => expect(r.body.code).toBe('TEMPLATE_MISSING_VARIABLE'));
    await put({ ...invitation(), colors: { band: 'hotpink', button: 'ink' } }).expect(400);
    await put({ ...invitation(), extra: 1 }).expect(400);
  });

  it('removes scripts and unsafe links from the body, and escapes the values it fills in', async () => {
    const agent = await admin();
    const body = '<p onclick="x()">Hi {{name}}</p><script>alert(1)</script><img src=x><a href="javascript:alert(1)">bad</a>';
    const saved = (await agent.put('/api/templates/email/auth.invitation').send({ content: invitation({ body }) }).expect(200)).body;
    expect(saved.content.en.body).not.toMatch(/script|onclick|<img|javascript:/);
    const mail = await renderer().renderEmail('auth.invitation', 'en', { name: '<b>Eve</b>', link: 'https://x.test' });
    expect(mail.html).toContain('&#60;b&#62;Eve&#60;/b&#62;');
    expect(mail.html).not.toContain('<b>Eve</b>');
  });

  it('shows a preview with example values and sends a test only to the person asking', async () => {
    const agent = await admin();
    const preview = (await agent.post('/api/templates/email/auth.invitation/preview').send({ content: invitation(), lang: 'en' }).expect(200)).body;
    expect(preview.title).toBe('Welcome Sara Ahmed');
    expect(preview.html).toContain('Hello Sara Ahmed');
    const sent = (await agent.post('/api/templates/email/auth.invitation/test').send({ content: invitation(), lang: 'ar' }).expect(200)).body;
    expect(t.mail.sent.at(-1)).toMatchObject({ to: sent.sentTo, subject: 'أهلًا سارة أحمد', purpose: 'test' });
  });

  it('needs the permission and admin mode, and the change is audited without the wording', async () => {
    const plain = await t.factories.signIn(await t.factories.user());
    await plain.get('/api/templates/email').expect(403);
    const noMode = await t.factories.signIn(await t.factories.user({ grants: EMAIL_KEYS.map((key) => ({ key, scope: 'all' as const })) }));
    expect((await noMode.get('/api/templates/email').expect(403)).body.code).toBe('ADMIN_MODE_REQUIRED');
    const viewer = await admin([P.TemplatesEmailView]);
    await viewer.put('/api/templates/email/auth.invitation').send({ content: invitation() }).expect(403);
    await viewer.post('/api/templates/email/auth.invitation/reset').expect(403);
    await viewer.post('/api/templates/email/auth.invitation/test').send({ content: invitation(), lang: 'en' }).expect(403);
    await (await admin()).put('/api/templates/email/auth.invitation').send({ content: invitation({ body: '<p>SECRET-WORDING {{name}}</p>' }) }).expect(200);
    await new Promise((r) => setTimeout(r, 200));
    const rows = await t.db.query<{ changes: unknown }[]>(`SELECT changes FROM audit_logs WHERE action = 'template.saved' AND entity_id = 'auth.invitation'`);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0]?.changes)).not.toContain('SECRET-WORDING');
  });

  it('holds a change for a second person when approval is on, and the author cannot approve it', async () => {
    const author = await admin();
    const approver = await admin([P.TemplatesEmailView, P.TemplatesEmailApprove]);
    await author.put('/api/templates/email/settings').send({ requireApproval: true }).expect(200).expect((r) => expect(r.body.requireApproval).toBe(true));
    const pending = (await author.put('/api/templates/email/auth.invitation').send({ content: invitation() }).expect(200)).body;
    expect(pending).toMatchObject({ status: 'pending' });
    expect(pending.pending.content.en.title).toBe('Welcome {{name}}');
    expect((await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test' })).subject).toBe('Activate your Arweqah account');
    await author.post('/api/templates/email/auth.invitation/approve').expect(403).expect((r) => expect(r.body.code).toBe('TEMPLATE_SELF_APPROVAL'));
    await approver.post('/api/templates/email/auth.invitation/approve').expect(200).expect((r) => expect(r.body.status).toBe('custom'));
    expect((await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test' })).subject).toBe('Welcome Sara');
    await approver.post('/api/templates/email/auth.invitation/approve').expect(409).expect((r) => expect(r.body.code).toBe('TEMPLATE_NOTHING_PENDING'));
  });

  it('keeps a reset behind the second person too, and a change back to the default is stored as no customisation', async () => {
    const author = await admin();
    const approver = await admin([P.TemplatesEmailView, P.TemplatesEmailApprove]);
    await author.put('/api/templates/email/auth.invitation').send({ content: invitation() }).expect(200);
    await author.put('/api/templates/email/settings').send({ requireApproval: true }).expect(200);
    const asked = (await author.post('/api/templates/email/auth.invitation/reset').expect(200)).body;
    expect(asked.status).toBe('pending');
    expect((await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test' })).subject).toBe('Welcome Sara');
    const done = (await approver.post('/api/templates/email/auth.invitation/approve').expect(200)).body;
    expect(done.status).toBe('default');
    const [row] = await t.db.query<{ content: unknown }[]>(`SELECT content FROM message_templates WHERE key = 'auth.invitation'`);
    expect(row?.content).toBeNull();
    expect((await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test' })).subject).toBe('Activate your Arweqah account');
  });

  it('keeps a line break out of a subject, and limits the test messages a person can send', async () => {
    const agent = await admin();
    const saved = (await agent.put('/api/templates/email/auth.invitation').send({ content: invitation({ title: 'Hi\r\nBcc: x@y.z' }) }).expect(200)).body;
    expect(saved.content.en.title).toBe('Hi Bcc: x@y.z');
    for (let i = 0; i < 5; i++) await agent.post('/api/templates/email/auth.invitation/test').send({ content: invitation(), lang: 'en' }).expect(200);
    await agent.post('/api/templates/email/auth.invitation/test').send({ content: invitation(), lang: 'en' }).expect(422).expect((r) => expect(r.body.code).toBe('TEMPLATE_TEST_RATE_LIMITED'));
  });

  it('saves two first edits of the same message at once without a conflict', async () => {
    const a = await admin();
    const b = await admin();
    const results = await Promise.all([
      a.put('/api/templates/email/auth.invitation').send({ content: invitation({ title: 'One {{name}}' }) }),
      b.put('/api/templates/email/auth.invitation').send({ content: invitation({ title: 'Two {{name}}' }) }),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const rows = await t.db.query<{ key: string }[]>(`SELECT key FROM message_templates WHERE key = 'auth.invitation'`);
    expect(rows).toHaveLength(1);
  });

  it('still sends the default when the wording cannot be read', async () => {
    const repo = t.app.get(MessageTemplateRepository);
    renderer().invalidate();
    const spy = vi.spyOn(repo, 'find').mockRejectedValueOnce(new Error('connection lost'));
    const mail = await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test' });
    spy.mockRestore();
    expect(mail.subject).toBe('Activate your Arweqah account');
  });

  it('lets an approver reject a change, which leaves the live wording as it was', async () => {
    const author = await admin();
    const approver = await admin([P.TemplatesEmailView, P.TemplatesEmailApprove]);
    await author.put('/api/templates/email/settings').send({ requireApproval: true }).expect(200);
    await author.put('/api/templates/email/auth.invitation').send({ content: invitation() }).expect(200);
    await approver.post('/api/templates/email/auth.invitation/reject').send({ note: 'No' }).expect(200).expect((r) => expect(r.body.status).toBe('default'));
    expect((await renderer().renderEmail('auth.invitation', 'en', { name: 'Sara', link: 'https://x.test' })).subject).toBe('Activate your Arweqah account');
    const viewer = await admin([P.TemplatesEmailView]);
    await viewer.put('/api/templates/email/settings').send({ requireApproval: false }).expect(403);
    await viewer.post('/api/templates/email/auth.invitation/approve').expect(403);
  });
});

describe('Notification templates (FR-65)', () => {
  const t = useTestApp();
  const admin = async (keys = NOTE_KEYS) => t.factories.signInAdminMode(await t.factories.user({ grants: grant(keys) }));
  const renderer = () => t.app.get(TemplateRenderer);

  it('lists the notices of tickets and tasks, and sends the default until one is edited', async () => {
    const agent = await admin();
    const res = (await agent.get('/api/templates/notification').expect(200)).body;
    expect(res.templates.map((x: { key: string }) => x.key)).toEqual(expect.arrayContaining(['ticket.created', 'task.assigned', 'task.status_changed']));
    const before = await renderer().renderNotice('task.status_changed', { taskNumber: 'TSK-000045', task: 'TSK-000045 — Plan', count: '0' }, { ar: { status: 'مكتملة' }, en: { status: 'Done' } });
    expect(before).toMatchObject({ titleEn: 'TSK-000045 changed status', bodyEn: 'Task TSK-000045 — Plan is now "Done".', bodyAr: 'صارت المهمة TSK-000045 — Plan «مكتملة».' });
    await agent.put('/api/templates/notification/task.status_changed').send({ content: notice('Hi {{taskNumber}}', 'Now {{status}} for {{task}}') }).expect(200);
    const after = await renderer().renderNotice('task.status_changed', { taskNumber: 'TSK-000045', task: 'TSK-000045', count: '0' }, { ar: { status: 'مكتملة' }, en: { status: 'Done' } });
    expect(after).toMatchObject({ titleEn: 'Hi TSK-000045', bodyEn: 'Now Done for TSK-000045', bodyAr: 'Now مكتملة for TSK-000045' });
  });

  it('refuses variables the notice cannot fill and markup, and resets to the default', async () => {
    const agent = await admin();
    await agent.put('/api/templates/notification/task.assigned').send({ content: notice('x', '{{deskName}}') }).expect(422).expect((r) => expect(r.body.code).toBe('TEMPLATE_UNKNOWN_VARIABLE'));
    await agent.put('/api/templates/notification/task.assigned').send({ content: notice('x', '<b>bold</b> {{task}}') }).expect(422).expect((r) => expect(r.body.code).toBe('TEMPLATE_INVALID_CONTENT'));
    await agent.put('/api/templates/notification/task.assigned').send({ content: notice('x', 'ok {{task}}') }).expect(200);
    await agent.post('/api/templates/notification/task.assigned/reset').expect(200).expect((r) => expect(r.body.status).toBe('default'));
    await agent.get('/api/templates/notification').expect(200);
    await agent.put('/api/templates/notification/nothing.here').send({ content: notice('x', 'y') }).expect(404);
  });

  it('is limited by permission and admin mode, separate from the e-mail templates', async () => {
    const emailOnly = await admin([P.TemplatesEmailView]);
    await emailOnly.get('/api/templates/notification').expect(403);
    const viewer = await admin([P.TemplatesNotificationView]);
    await viewer.get('/api/templates/notification').expect(200);
    await viewer.put('/api/templates/notification/task.assigned').send({ content: notice('x', 'y') }).expect(403);
    await viewer.get('/api/templates/email').expect(403);
  });
});
