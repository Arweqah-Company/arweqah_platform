import { REACTION_KEYS, type TicketDto } from '@arweqah-platform/shared';
import { describe, expect, it } from 'vitest';
import type { TestAgent } from './factories/factories';
import { ticketWorld } from './helpers/ticket-world';
import { useTestApp } from './setup/test-app';

describe('Reactions on the replies of a ticket (FR-206, FR-207)', () => {
  const t = useTestApp();
  type World = Awaited<ReturnType<typeof ticketWorld>>;

  const reply = async (agent: TestAgent, w: World, body = 'نص') => ((await agent.post(`/api/tickets/${w.ticket.id}/replies`).send({ body }).expect(201)).body as TicketDto).events.at(-1)!;
  const url = (w: World, eventId: string) => `/api/tickets/${w.ticket.id}/events/${eventId}/reaction`;
  const react = (agent: TestAgent, w: World, eventId: string, reaction: string) => agent.put(url(w, eventId)).send({ reaction });
  const chips = (ticket: TicketDto, eventId: string) => ticket.events.find((e) => e.id === eventId)!.reactions;
  const reacted = async (agent: TestAgent) => ((await agent.get('/api/notifications').expect(200)).body.items as { titleEn: string; link: string }[]).filter((n) => n.titleEn.includes('reacted to your reply'));

  it('puts a reaction on a reply: a chip with the count, the viewer’s mark and the names', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w);
    const after = (await react(w.agents.sender, w, sent.id, 'love').expect(200)).body as TicketDto;
    expect(chips(after, sent.id)).toEqual([{ reaction: 'love', count: 1, mine: true, people: [{ id: w.sender.id, name: expect.any(String) }] }]);
    const seenByAuthor = (await w.agents.assignee.get(`/api/tickets/${w.ticket.id}`).expect(200)).body as TicketDto;
    expect(chips(seenByAuthor, sent.id)).toMatchObject([{ reaction: 'love', count: 1, mine: false }]);
  });

  it('keeps one reaction per person: another one replaces it, the same key twice changes nothing, and a delete removes it', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w);
    await react(w.agents.sender, w, sent.id, 'like').expect(200);
    const changed = (await react(w.agents.sender, w, sent.id, 'wow').expect(200)).body as TicketDto;
    expect(chips(changed, sent.id)).toMatchObject([{ reaction: 'wow', count: 1, mine: true }]);
    await react(w.agents.sender, w, sent.id, 'wow').expect(200);
    expect(await t.db.query(`SELECT 1 FROM conversation_reactions WHERE target_id = $1 AND user_id = $2`, [sent.id, w.sender.id])).toHaveLength(1);
    await react(w.agents.colleague, w, sent.id, 'wow').expect(404); // not a party yet
    await react(w.agents.assignee, w, sent.id, 'wow').expect(200);
    const both = (await w.agents.sender.get(`/api/tickets/${w.ticket.id}`).expect(200)).body as TicketDto;
    expect(chips(both, sent.id)).toMatchObject([{ reaction: 'wow', count: 2, mine: true }]);
    const removed = (await w.agents.sender.delete(url(w, sent.id)).expect(200)).body as TicketDto;
    expect(chips(removed, sent.id)).toMatchObject([{ reaction: 'wow', count: 1, mine: false }]);
    await w.agents.sender.delete(url(w, sent.id)).expect(200); // removing what is not there is fine
  });

  it('accepts the six reactions and nothing else (400)', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w);
    for (const key of REACTION_KEYS) await react(w.agents.sender, w, sent.id, key).expect(200);
    await react(w.agents.sender, w, sent.id, 'angry').expect(400);
    await w.agents.sender.put(url(w, sent.id)).send({ reaction: 'like', extra: 1 }).expect(400);
    await w.agents.sender.put(url(w, sent.id)).send({}).expect(400);
  });

  it('tells the author once per new reaction, and nothing for a change, a removal or a reaction to one’s own reply (FR-207)', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w);
    await react(w.agents.sender, w, sent.id, 'like').expect(200);
    const first = await reacted(w.agents.assignee);
    expect(first).toHaveLength(1);
    expect(first[0]!.link).toBe(`/tickets/${w.ticket.id}`);
    await react(w.agents.sender, w, sent.id, 'love').expect(200);
    await w.agents.sender.delete(url(w, sent.id)).expect(200);
    expect(await reacted(w.agents.assignee)).toHaveLength(1);
    await react(w.agents.assignee, w, sent.id, 'haha').expect(200);
    expect(await reacted(w.agents.assignee)).toHaveLength(1);
    expect(await reacted(w.agents.sender)).toHaveLength(0);
  });

  it('needs the key (403) and a ticket and reply the person sees (404)', async () => {
    const w = await ticketWorld(t, { senderWithout: ['tickets.reply_react'] });
    const sent = await reply(w.agents.assignee, w);
    expect((await react(w.agents.sender, w, sent.id, 'like').expect(403)).body.code).toBeDefined();
    await w.agents.sender.delete(url(w, sent.id)).expect(403);
    await react(w.agents.colleague, w, sent.id, 'like').expect(404);
    await react(w.agents.assignee, w, '00000000-0000-4000-8000-000000000000', 'like').expect(404);
    await react(w.agents.assignee, w, w.ticket.events[0]!.id, 'like').expect(404); // the opening entry is not a reply
    await w.agents.assignee.put(`/api/tickets/00000000-0000-4000-8000-000000000000/events/${sent.id}/reaction`).send({ reaction: 'like' }).expect(404);
  });

  it('still takes reactions on a closed ticket, and leaves the ticket as it was', async () => {
    const w = await ticketWorld(t);
    const sent = await reply(w.agents.assignee, w);
    await w.agents.assignee.post(`/api/tickets/${w.ticket.id}/close-without-execution`).send({}).expect(200);
    const after = (await react(w.agents.sender, w, sent.id, 'sad').expect(200)).body as TicketDto;
    expect(after.status).toBe('closed');
    expect(chips(after, sent.id)).toMatchObject([{ reaction: 'sad', count: 1 }]);
  });
});
