import { CorePermission, type TicketDto, type PersonRefDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import { TICKET_DESK_ADMIN_GRANTS, type TestAgent, type TestUser } from './factories/factories';
import { codeFor } from './helpers/totp';
import { DOCX, XLSX } from './helpers/office-files';
import { useTestApp } from './setup/test-app';

const SETTINGS = { receptionStatus: 'active', descriptionAr: null, descriptionEn: null, acceptsPersonal: true, defaultDueDays: 3, minLeadDays: 0, autoCloseDays: 4, reopenWindowDays: 7, staleAfterDays: 14 };
const TYPE = { nameAr: 'مشكلة', nameEn: 'Problem', descriptionAr: null, descriptionEn: null, dueDays: null, isPersonal: false, isActive: true };
const mention = (user: TestUser) => `{{mention:${user.id}}}`;

describe('Ticket replies to replies and mentions (FR-128)', () => {
  const t = useTestApp();

  async function world(options: { personal?: boolean; senderWithout?: string[] } = {}) {
    const org = await t.factories.org();
    const manager = await t.factories.user({ unit: org.unitA, grants: TICKET_DESK_ADMIN_GRANTS });
    const assignee = await t.factories.user({ unit: org.unitA });
    const sender = await t.factories.user({ unit: org.unitB, without: options.senderWithout });
    const colleague = await t.factories.user({ unit: org.unitC });
    const otherCompany = await t.factories.user({ unit: org.unitOther });
    const noKeys = await t.factories.user({ unit: org.unitA, without: ['tickets.comment'] });

    await t.db.query('UPDATE org_nodes SET manager_id = $1 WHERE id = $2', [manager.employeeId, org.department]);
    const managerAgent = await t.factories.signIn(manager);
    await managerAgent.post('/api/admin-mode/activate').send({ code: codeFor(manager.secret, Date.now() + 30_000) }).expect(200);
    await managerAgent.put(`/api/tickets/setup/desks/${org.department}`).send(SETTINGS).expect(200);
    const typeId = (await managerAgent.post(`/api/tickets/setup/desks/${org.department}/types`).send({ ...TYPE, isPersonal: options.personal ?? false, defaultAssigneeUserId: assignee.id }).expect(201)).body.id as string;
    const agents: Record<string, TestAgent> = {
      assignee: await t.factories.signIn(assignee),
      sender: await t.factories.signIn(sender),
      colleague: await t.factories.signIn(colleague),
      noKeys: await t.factories.signIn(noKeys),
    };
    const ticket = (await agents.sender!.post('/api/tickets').send({ typeId, title: 'الطابعة', details: 'تفاصيل' }).expect(201)).body as TicketDto;
    return { assignee, sender, colleague, otherCompany, noKeys, agents: agents as Record<'assignee' | 'sender' | 'colleague' | 'noKeys', TestAgent>, ticket };
  }

  const reply = (agent: TestAgent, ticketId: string, body: Record<string, unknown>) => agent.post(`/api/tickets/${ticketId}/replies`).send(body);
  const lastReply = (ticket: TicketDto) => [...ticket.events].reverse().find((e) => e.type === 'reply');

  it('files an answer to an answer under the first reply and names whom it answers, and tells that person', async () => {
    const w = await world();
    const first = lastReply((await reply(w.agents.assignee, w.ticket.id, { body: 'جاري العمل' }).expect(201)).body)!;
    const answered = (await reply(w.agents.sender, w.ticket.id, { body: 'شكرًا', parentEventId: first.id }).expect(201)).body as TicketDto;
    const answer = lastReply(answered)!;
    expect(answer).toMatchObject({ parentId: first.id, replyTo: { id: w.assignee.id } });
    const again = lastReply((await reply(w.agents.assignee, w.ticket.id, { body: 'عفوًا', parentEventId: answer.id }).expect(201)).body)!;
    expect(again).toMatchObject({ parentId: first.id, replyTo: { id: w.sender.id } }); // still one level
    const notices = (await w.agents.assignee.get('/api/notifications').expect(200)).body.items as { titleEn: string }[];
    expect(notices.some((n) => n.titleEn.includes('answered your reply'))).toBe(true);
  });

  it('refuses an answer to something that is not a reply of this ticket (422)', async () => {
    const w = await world();
    await reply(w.agents.assignee, w.ticket.id, { body: 'x' }).expect(201);
    await reply(w.agents.sender, w.ticket.id, { body: 'y', parentEventId: '00000000-0000-4000-8000-000000000000' }).expect(422);
    await reply(w.agents.sender, w.ticket.id, { body: 'y', parentEventId: w.ticket.events[0]!.id }).expect(422); // the opening entry is not a reply
  });

  it('needs the keys to answer a reply and to mention (403), while a plain reply still works', async () => {
    const w = await world({ senderWithout: ['tickets.comment'] });
    const first = lastReply((await reply(w.agents.assignee, w.ticket.id, { body: 'x' }).expect(201)).body)!;
    expect((await reply(w.agents.sender, w.ticket.id, { body: 'y', parentEventId: first.id }).expect(403)).body.code).toBe('TICKET_COMMENT_NOT_ALLOWED');
    expect((await reply(w.agents.sender, w.ticket.id, { body: `y ${mention(w.colleague)}` }).expect(403)).body.code).toBe('TICKET_COMMENT_NOT_ALLOWED');
    await reply(w.agents.sender, w.ticket.id, { body: 'plain' }).expect(201);
  });

  it('mentions a colleague: they are told, see the ticket, and may reply but not close it', async () => {
    const w = await world();
    await w.agents.colleague.get(`/api/tickets/${w.ticket.id}`).expect(404); // before the mention nobody outside sees it
    const posted = (await reply(w.agents.assignee, w.ticket.id, { body: `انظر ${mention(w.colleague)}` }).expect(201)).body as TicketDto;
    expect(lastReply(posted)!.mentions).toEqual([{ id: w.colleague.id, name: expect.any(String) }]);
    const notices = (await w.agents.colleague.get('/api/notifications').expect(200)).body.items as { link: string; titleEn: string }[];
    expect(notices.find((n) => n.titleEn.includes('mentioned you'))?.link).toBe(`/tickets/${w.ticket.id}`);
    const seen = (await w.agents.colleague.get(`/api/tickets/${w.ticket.id}`).expect(200)).body as TicketDto;
    expect(seen.relations).toEqual(['mentioned']);
    expect(seen.abilities).toMatchObject({ reply: true, requestClose: false, closeWithoutExecution: false, confirmClose: false });
    await reply(w.agents.colleague, w.ticket.id, { body: 'تم الاطلاع' }).expect(201);
    const senderNotices = (await w.agents.sender.get('/api/notifications').expect(200)).body.items as { titleEn: string }[];
    expect(senderNotices.length).toBeGreaterThan(0);
    await w.agents.colleague.post(`/api/tickets/${w.ticket.id}/close-without-execution`).send({}).expect((res) => expect(res.status).toBeGreaterThanOrEqual(400));
  });

  it('accepts only active employees of the ticket’s company, and needs the key (403)', async () => {
    const w = await world();
    await reply(w.agents.assignee, w.ticket.id, { body: `x ${mention(w.otherCompany)}` }).expect(422);
    await w.agents.noKeys.get(`/api/tickets/${w.ticket.id}/mentionables`).expect(403);
  });

  it('lists the people to mention for somebody who may, searched by name', async () => {
    const w = await world();
    const all = (await w.agents.assignee.get(`/api/tickets/${w.ticket.id}/mentionables`).expect(200)).body as PersonRefDto[];
    expect(all.map((p) => p.id)).toEqual(expect.arrayContaining([w.colleague.id, w.sender.id]));
    expect(all.map((p) => p.id)).not.toContain(w.otherCompany.id);
    await w.agents.colleague.get(`/api/tickets/${w.ticket.id}/mentionables`).expect(404); // not a party yet
    expect((await w.agents.assignee.get(`/api/tickets/${w.ticket.id}/mentionables?search=zzzz-none`).expect(200)).body).toEqual([]);
  });

  it('lets nobody but its two sides be mentioned on a personal ticket', async () => {
    const w = await world({ personal: true });
    await reply(w.agents.assignee, w.ticket.id, { body: `x ${mention(w.colleague)}` }).expect(422);
    await reply(w.agents.assignee, w.ticket.id, { body: `x ${mention(w.sender)}` }).expect(201);
    expect(CorePermission.TicketsCommentMention).toBe('tickets.comment_mention');
  });

  it('streams an attached image inline for the preview window, to the people of the ticket only (404 for anybody else)', async () => {
    const w = await world();
    const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
    const file = (await w.agents.sender.post('/api/files').attach('file', png, 'screen.png').expect(201)).body as { id: string };
    const withFile = (await w.agents.sender.post(`/api/tickets/${w.ticket.id}/replies`).send({ body: 'مرفق', fileIds: [file.id] }).expect(201)).body as TicketDto;
    expect(withFile.events.at(-1)!.attachments).toHaveLength(1);
    const url = `/api/tickets/${w.ticket.id}/attachments/${file.id}/preview`;
    const res = await w.agents.assignee.get(url).buffer(true).parse((r, done) => { const chunks: Buffer[] = []; r.on('data', (c: Buffer) => chunks.push(c)); r.on('end', () => done(null, Buffer.concat(chunks))); }).expect(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['content-disposition']).toMatch(/^inline;/);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect((res.body as Buffer).equals(png)).toBe(true);
    await w.agents.colleague.get(url).expect(404);
  });

  it('accepts Word and Excel files on a reply and serves their bytes to the preview window, to the people of the ticket only (FR-128)', async () => {
    const w = await world();
    const upload = async (buffer: Buffer, name: string) => (await w.agents.sender.post('/api/files').attach('file', buffer, name).expect(201)).body as { id: string; contentType: string };
    const docx = await upload(DOCX, 'report.docx');
    const xlsx = await upload(XLSX, 'figures.xlsx');
    expect(docx.contentType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(xlsx.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const posted = (await w.agents.sender.post(`/api/tickets/${w.ticket.id}/replies`).send({ body: 'ملفات', fileIds: [docx.id, xlsx.id] }).expect(201)).body as TicketDto;
    expect(posted.events.at(-1)!.attachments.map((a) => a.originalName).sort()).toEqual(['figures.xlsx', 'report.docx']);
    await w.agents.assignee.get(`/api/tickets/${w.ticket.id}/attachments/${docx.id}`).expect(200);
    const preview = await w.agents.assignee.get(`/api/tickets/${w.ticket.id}/attachments/${docx.id}/preview`).buffer(true).parse((r, done) => { const chunks: Buffer[] = []; r.on('data', (c: Buffer) => chunks.push(c)); r.on('end', () => done(null, Buffer.concat(chunks))); }).expect(200);
    expect(preview.headers['content-type']).toContain('wordprocessingml.document');
    expect((preview.body as Buffer).equals(DOCX)).toBe(true);
    await w.agents.colleague.get(`/api/tickets/${w.ticket.id}/attachments/${docx.id}/preview`).expect(404);
    await w.agents.sender.post('/api/files').attach('file', DOCX, 'macro.docm').expect((r) => expect(r.status).toBe(201)); // the bytes decide, not the name
    await w.agents.sender.post('/api/files').attach('file', Buffer.from('MZ not an office file'), 'x.docx').expect(422);
  });
});
