import { CorePermission, type TicketDto, type TicketEventDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { TicketTimeline } from './ticket-timeline';

const SARA = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const event = (over: Partial<TicketEventDto>): TicketEventDto => ({ id: 'e', type: 'reply', actor: { id: 'u2', name: 'منى خالد' }, body: 'نص', parentId: null, replyTo: null, mentions: [], attachments: [], createdAt: '2026-10-28T10:00:00.000Z', isEdited: false, mayEdit: false, reactions: [], ...over });
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

describe('Ticket timeline: the message that comes with a step (FR-194)', () => {
  it('shows the message of a closing request, with the step named, in the conversation', async () => {
    serve([CorePermission.TicketsCommentReply]);
    const asked = event({ id: 'e9', type: 'close_requested', actor: { id: 'u2', name: 'منى خالد' }, body: 'تم تنفيذ الطلب، هل تؤكد؟' });
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1', body: 'جاري العمل' }), asked])} />);
    const entry = (await screen.findByText('تم تنفيذ الطلب، هل تؤكد؟')).closest('div[id^="event-"]') as HTMLElement;
    expect(within(entry).getByText(/طُلب إغلاق التذكرة/)).toBeInTheDocument();
    expect(within(entry).queryByRole('button', { name: 'ردّ على هذا الردّ' })).not.toBeInTheDocument();
  });

  it('leaves out steps without a message, and the ticket text of the «created» step', async () => {
    serve([CorePermission.TicketsCommentReply]);
    const created = event({ id: 'c', type: 'created', body: 'تفاصيل التذكرة' });
    const confirmed = event({ id: 'k', type: 'confirmed', body: null });
    renderPage(<TicketTimeline ticket={ticket([created, confirmed, event({ id: 'e1', body: 'ردّ عادي' })])} />);
    expect(await screen.findByText('ردّ عادي')).toBeInTheDocument();
    expect(screen.queryByText('تفاصيل التذكرة')).not.toBeInTheDocument();
    expect(document.querySelectorAll('div[id^="event-"]')).toHaveLength(1);
  });
});

describe('Ticket timeline: editing one\'s own reply (FR-205)', () => {
  const patched = () => {
    const calls: { path: string; body: unknown }[] = [];
    server.use(http.patch('*/api/tickets/t1/events/:eventId', async ({ request, params }) => {
      calls.push({ path: String(params.eventId), body: await request.json() });
      return HttpResponse.json(ticket([event({ id: 'e1', body: 'نص معدّل', isEdited: true, mayEdit: true })]));
    }));
    return calls;
  };

  it('offers the pencil only on a reply the API says may be edited, and shows the «edited» mark', async () => {
    serve([CorePermission.TicketsCommentReply]);
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1', mayEdit: true, isEdited: true }), event({ id: 'e2', body: 'ردّ غيري' })])} />);
    await screen.findByText('ردّ غيري');
    expect(screen.getAllByRole('button', { name: 'تعديل ردّي' })).toHaveLength(1);
    expect(screen.getByText('معدّل')).toBeInTheDocument();
  });

  it('edits in place: the text is in the box, the change is sent with Ctrl+Enter, and the box closes', async () => {
    serve([CorePermission.TicketsCommentReply]);
    const calls = patched();
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1', body: 'النص الأول', mayEdit: true })])} />);
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل ردّي' }));
    const box = await screen.findByRole('textbox', { name: 'تعديل ردّك' });
    expect(box).toHaveValue('النص الأول');
    fireEvent.change(box, { target: { value: 'نص معدّل' } });
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(calls).toEqual([{ path: 'e1', body: { body: 'نص معدّل' } }]));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'تعديل ردّك' })).not.toBeInTheDocument());
  });

  it('keeps the mention of a person who stays named, and cancels without sending', async () => {
    serve([CorePermission.TicketsCommentReply, CorePermission.TicketsCommentMention]);
    const calls = patched();
    const named = event({ id: 'e1', body: `شكرًا {{mention:${SARA}}}`, mentions: [{ id: SARA, name: 'سارة أحمد' }], mayEdit: true });
    renderPage(<TicketTimeline ticket={ticket([named])} />);
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل ردّي' }));
    const box = await screen.findByRole('textbox', { name: 'تعديل ردّك' });
    expect(box).toHaveValue('شكرًا @سارة أحمد');
    fireEvent.change(box, { target: { value: 'شكرًا جزيلًا @سارة أحمد' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديل' }));
    await waitFor(() => expect(calls[0]?.body).toEqual({ body: `شكرًا جزيلًا {{mention:${SARA}}}` }));
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل ردّي' }));
    fireEvent.click(await screen.findByRole('button', { name: 'إلغاء' }));
    expect(calls).toHaveLength(1);
  });

  it('shows the API\'s refusal in words (the time passed) and keeps the box', async () => {
    serve([CorePermission.TicketsCommentReply]);
    server.use(http.patch('*/api/tickets/t1/events/:eventId', () => HttpResponse.json({ code: 'TICKET_REPLY_EDIT_EXPIRED', message: 'x' }, { status: 422 })));
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1', mayEdit: true })])} />);
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل ردّي' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'تعديل ردّك' }), { target: { value: 'متأخر' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديل' }));
    expect(await screen.findByText(/انتهت مهلة تعديل الردّ/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'تعديل ردّك' })).toBeInTheDocument();
  });
});

describe('Ticket timeline: reactions on replies (FR-206)', () => {
  it('shows the chips of a reply with the names, and none on a step that carries no message', async () => {
    serve([]);
    const chips = [{ reaction: 'love' as const, count: 1, mine: false, people: [{ id: 'u9', name: 'علي حسن' }] }];
    const asked = event({ id: 'e9', type: 'close_requested', body: null });
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1', reactions: chips }), asked])} />);
    expect(await screen.findByRole('button', { name: /حب من علي حسن/ })).toBeInTheDocument();
    expect(document.querySelectorAll('ul[aria-label="التفاعلات"]')).toHaveLength(1);
  });

  it('also shows the picker under the message written when closing was asked (FR-219)', async () => {
    serve([]);
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e9', type: 'close_requested', body: 'تم التنفيذ' })])} />);
    expect(await screen.findByRole('button', { name: 'تفاعل' })).toBeInTheDocument();
  });

  it('puts a reaction from the picker, and removes mine with a click on its chip', async () => {
    serve([]);
    const calls: { method: string; path: string; body: unknown }[] = [];
    server.use(
      http.put('*/api/tickets/t1/events/:eventId/reaction', async ({ request, params }) => {
        calls.push({ method: 'PUT', path: String(params.eventId), body: await request.json() });
        return HttpResponse.json(ticket([event({ id: 'e1', reactions: [{ reaction: 'wow', count: 1, mine: true, people: [{ id: 'u1', name: 'سارة أحمد' }] }] })]));
      }),
      http.delete('*/api/tickets/t1/events/:eventId/reaction', ({ params }) => {
        calls.push({ method: 'DELETE', path: String(params.eventId), body: null });
        return HttpResponse.json(ticket([event({ id: 'e1' })]));
      }),
    );
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1', reactions: [{ reaction: 'like', count: 1, mine: true, people: [{ id: 'u1', name: 'سارة أحمد' }] }] })])} />);
    fireEvent.click(await screen.findByRole('button', { name: 'تفاعل' }));
    fireEvent.click(within(await screen.findByRole('group', { name: 'اختر تفاعلًا' })).getByRole('button', { name: 'واو' }));
    await waitFor(() => expect(calls).toEqual([{ method: 'PUT', path: 'e1', body: { reaction: 'wow' } }]));
    fireEvent.click(screen.getByRole('button', { name: /إعجاب من سارة أحمد/ }));
    await waitFor(() => expect(calls.at(-1)).toEqual({ method: 'DELETE', path: 'e1', body: null }));
  });

  it('hides the picker from a person without the key', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me([], { without: ['tickets.'] }))));
    renderPage(<TicketTimeline ticket={ticket([event({ id: 'e1' })])} />);
    await screen.findByText('نص');
    expect(screen.queryByRole('button', { name: 'تفاعل' })).not.toBeInTheDocument();
  });
});
