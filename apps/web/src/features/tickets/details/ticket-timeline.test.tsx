import { CorePermission, type TicketDto, type TicketEventDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { TicketTimeline } from './ticket-timeline';

const SARA = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const event = (over: Partial<TicketEventDto>): TicketEventDto => ({ id: 'e', type: 'reply', actor: { id: 'u2', name: 'منى خالد' }, body: 'نص', parentId: null, replyTo: null, mentions: [], attachments: [], createdAt: '2026-10-28T10:00:00.000Z', ...over });
const ticket = (events: TicketEventDto[], reply = true): TicketDto => ({ id: 't1', abilities: { reply }, events } as unknown as TicketDto);

function serve(keys: string[], calls: unknown[] = []) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/tickets/t1/mentionables', () => HttpResponse.json([{ id: SARA, name: 'سارة أحمد' }])),
    http.post('*/api/tickets/t1/replies', async ({ request }) => {
      calls.push(await request.json());
      return HttpResponse.json({});
    }),
  );
}

describe('Ticket timeline: answers to replies, mentions and files (FR-128)', () => {
  it('puts an answer under its reply, with who it answers and the mention as a chip', async () => {
    serve([CorePermission.TicketsCommentReply]);
    const first = event({ id: 'e1', body: 'جاري العمل' });
    const answer = event({ id: 'e2', parentId: 'e1', actor: { id: 'u3', name: 'علي حسن' }, replyTo: { id: 'u2', name: 'منى خالد' }, body: `شكرًا {{mention:${SARA}}}`, mentions: [{ id: SARA, name: 'سارة أحمد' }] });
    renderPage(<TicketTimeline ticket={ticket([first, answer])} />);
    const nested = (await screen.findByText('@سارة أحمد')).closest('li') as HTMLElement;
    expect(within(nested).getByText(/ردًّا على منى خالد/)).toBeInTheDocument();
    expect(nested.parentElement?.closest('li')).toContainElement(screen.getByText('جاري العمل'));
  });

  it('sends an answer with the parent reply and the picked person turned into a mention', async () => {
    const calls: unknown[] = [];
    serve([CorePermission.TicketsCommentReply, CorePermission.TicketsCommentMention], calls);
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1' })])} />);
    fireEvent.click(await screen.findByRole('button', { name: 'ردّ على هذا الردّ' }));
    const box = await screen.findByRole('textbox', { name: /ردّك على منى خالد/ });
    fireEvent.change(box, { target: { value: 'مرحبا @سا', selectionStart: 9 } });
    fireEvent.mouseDown(await screen.findByRole('option', { name: 'سارة أحمد' }));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الردّ' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ parentEventId: 'e1', body: `مرحبا {{mention:${SARA}}} ` }); // the server trims the trailing space
  });

  it('hides the answer button without the key or when the ticket takes no replies', async () => {
    serve([]);
    const { unmount } = renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1' })])} />);
    await screen.findByText('نص');
    expect(screen.queryByRole('button', { name: 'ردّ على هذا الردّ' })).not.toBeInTheDocument();
    unmount();
    serve([CorePermission.TicketsCommentReply]);
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1' })], false)} />);
    await screen.findByText('نص');
    expect(screen.queryByRole('button', { name: 'ردّ على هذا الردّ' })).not.toBeInTheDocument();
  });

  it('gives each attachment a «View» button', async () => {
    serve([]);
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1', attachments: [{ fileId: 'f1', originalName: 'screen.png', contentType: 'image/png', size: 5 }] })])} />);
    expect(await screen.findByRole('button', { name: 'عرض screen.png' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'screen.png' })).toHaveAttribute('href', '/api/tickets/t1/attachments/f1');
  });
});
