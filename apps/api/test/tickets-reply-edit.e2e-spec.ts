import type { TicketDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent, TestUser } from './factories/factories';
import { ticketWorld } from './helpers/ticket-world';
import { useTestApp } from './setup/test-app';

const mention = (user: TestUser) => `{{mention:${user.id}}}`;

describe('Editing one’s own reply in a ticket (FR-205)', () => {
  const t = useTestApp();
  type World = Awaited<ReturnType<typeof ticketWorld>>;

  const reply = async (agent: TestAgent, w: World, body: string) => ((await agent.post(`/api/tickets/${w.ticket.id}/replies`).send({ body }).expect(201)).body as TicketDto).events.at(-1)!;
  const edit = (agent: TestAgent, w: World, eventId: string, body: unknown) => agent.patch(`/api/tickets/${w.ticket.id}/events/${eventId}`).send(body as object);
  const aged = (eventId: string, minutes: number) => t.db.query(`UPDATE ticket_events SET created_at = now() - make_interval(mins => $2) WHERE id = $1`, [eventId, minutes]);
  const notices = async (agent: TestAgent) => (await agent.get('/api/notifications').expect(200)).body.items as { titleEn: string }[];

  it('changes the text, marks it edited for everybody, and keeps its files and place', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w, 'النص الأول');
    expect(sent).toMatchObject({ isEdited: false, mayEdit: true });
    const after = (await edit(w.agents.assignee, w, sent.id, { body: '  النص بعد التعديل  ' }).expect(200)).body as TicketDto;
    const changed = after.events.find((e) => e.id === sent.id)!;
    expect(changed).toMatchObject({ body: 'النص بعد التعديل', isEdited: true, mayEdit: true, type: 'reply' });
    const seenBySender = ((await w.agents.sender.get(`/api/tickets/${w.ticket.id}`).expect(200)).body as TicketDto).events.find((e) => e.id === sent.id)!;
    expect(seenBySender).toMatchObject({ body: 'النص بعد التعديل', isEdited: true, mayEdit: false });
    await expect.poll(async () => (await t.db.query(`SELECT action, changes FROM audit_logs WHERE action = 'ticket.reply_edited'`)).length).toBe(1);
    expect(JSON.stringify(await t.db.query(`SELECT changes FROM audit_logs WHERE action = 'ticket.reply_edited'`))).not.toContain('النص');
  });

  it('refuses after 15 minutes with the minutes in the message (422), and stops offering the edit', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w, 'نص');
    await aged(sent.id, 16);
    const refused = await edit(w.agents.assignee, w, sent.id, { body: 'متأخر' }).expect(422);
    expect(refused.body).toMatchObject({ code: 'TICKET_REPLY_EDIT_EXPIRED' });
    expect(refused.body.message).toContain('15');
    const events = ((await w.agents.assignee.get(`/api/tickets/${w.ticket.id}`).expect(200)).body as TicketDto).events;
    expect(events.find((e) => e.id === sent.id)).toMatchObject({ body: 'نص', isEdited: false, mayEdit: false });
    await aged(sent.id, 14);
    await edit(w.agents.assignee, w, sent.id, { body: 'في الوقت' }).expect(200);
  });

  it('lets only the author edit: somebody else’s reply is refused (403), a missing or non-reply entry is not found (404)', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w, 'نص');
    await edit(w.agents.sender, w, sent.id, { body: 'x' }).expect(403);
    await edit(w.agents.assignee, w, '00000000-0000-4000-8000-000000000000', { body: 'x' }).expect(404);
    await edit(w.agents.assignee, w, w.ticket.events[0]!.id, { body: 'x' }).expect(404); // the opening entry is not a reply
  });

  it('needs the key (403) even for the author, and a ticket the person sees (404)', async () => {
    const w = await ticketWorld(t, { senderWithout: ['tickets.reply_edit'] });
    const own = await reply(w.agents.sender, w, 'ردي');
    expect(own.mayEdit).toBe(false);
    await edit(w.agents.sender, w, own.id, { body: 'x' }).expect(403);
    const sent = await reply(w.agents.assignee, w, 'نص');
    await edit(w.agents.colleague, w, sent.id, { body: 'x' }).expect(404); // not a party of the ticket
  });

  it('validates the body: empty, too long and unknown fields are refused (400)', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w, 'نص');
    await edit(w.agents.assignee, w, sent.id, { body: '   ' }).expect(400);
    await edit(w.agents.assignee, w, sent.id, { body: 'x'.repeat(5001) }).expect(400);
    await edit(w.agents.assignee, w, sent.id, { body: 'ok', fileIds: [] }).expect(400);
  });

  it('refuses on a closed ticket (422) and does not offer the edit there', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w, 'نص');
    await w.agents.assignee.post(`/api/tickets/${w.ticket.id}/close-without-execution`).send({}).expect(200);
    await edit(w.agents.assignee, w, sent.id, { body: 'x' }).expect(422);
    const events = ((await w.agents.assignee.get(`/api/tickets/${w.ticket.id}`).expect(200)).body as TicketDto).events;
    expect(events.find((e) => e.id === sent.id)!.mayEdit).toBe(false);
  });

  it('recomputes the mentions: a new person is told once, one who stays is not told again, one removed loses the mention', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w, `انظر ${mention(w.colleague)}`);
    expect((await notices(w.agents.colleague)).filter((n) => n.titleEn.includes('mentioned you'))).toHaveLength(1);
    const kept = (await edit(w.agents.assignee, w, sent.id, { body: `انظر ${mention(w.colleague)} وشكرًا ${mention(w.sender)}` }).expect(200)).body as TicketDto;
    expect(kept.events.find((e) => e.id === sent.id)!.mentions.map((m) => m.id).sort()).toEqual([w.colleague.id, w.sender.id].sort());
    expect((await notices(w.agents.colleague)).filter((n) => n.titleEn.includes('mentioned you'))).toHaveLength(1); // not again
    expect((await notices(w.agents.sender)).filter((n) => n.titleEn.includes('mentioned you'))).toHaveLength(1);
    const dropped = (await edit(w.agents.assignee, w, sent.id, { body: 'بلا إشارات' }).expect(200)).body as TicketDto;
    expect(dropped.events.find((e) => e.id === sent.id)!.mentions).toEqual([]);
  });

  it('applies the mention rules to the new text: another company is refused (422), and a new mention needs the key (403)', async () => {
    const w = await ticketWorld(t, { senderWithout: ['tickets.comment_mention'] });
    const sent = await reply(w.agents.assignee, w, 'نص');
    await edit(w.agents.assignee, w, sent.id, { body: `x ${mention(w.otherCompany)}` }).expect(422);
    const own = await reply(w.agents.sender, w, 'ردي');
    expect((await edit(w.agents.sender, w, own.id, { body: `x ${mention(w.colleague)}` }).expect(403)).body.code).toBe('TICKET_COMMENT_NOT_ALLOWED');
    await edit(w.agents.sender, w, own.id, { body: 'نص جديد بلا إشارة' }).expect(200);
  });
});
