import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { access, me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { ReplyBox } from './reply-box';

/** Serves the person's keys and records the bodies the box posts. */
function serve(keys: string[]) {
  const posted: Record<string, unknown>[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.post('*/api/tickets/t1/replies', async ({ request }) => {
      posted.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json({ id: 't1' });
    }),
  );
  return posted;
}

const write = async (text: string) => fireEvent.change(await screen.findByRole('textbox', { name: 'ردّك' }), { target: { value: text } });

describe('Reply and confirm the closing in one step (FR-186)', () => {
  it('offers «send and confirm the closing» on a ticket that waits for the sender, and posts confirmClose', async () => {
    const posted = serve(['tickets.reply', 'tickets.confirm_close']);
    renderPage(<ReplyBox ticketId="t1" confirming />);
    await write('أؤكد الإغلاق');
    expect(await screen.findByText(/«إرسال الردّ» وحده يعيدها «مفتوحة»/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'إرسال الردّ وتأكيد الإغلاق' }));
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ body: 'أؤكد الإغلاق', confirmClose: true });
  });

  it('keeps the plain send as it was: no confirmClose in the request', async () => {
    const posted = serve(['tickets.reply', 'tickets.confirm_close']);
    renderPage(<ReplyBox ticketId="t1" confirming />);
    await write('لم يكتمل بعد');
    fireEvent.click(await screen.findByRole('button', { name: 'إرسال الردّ' }));
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).not.toHaveProperty('confirmClose');
  });

  it('shows no extra button without the key to confirm, or when the ticket is not waiting', async () => {
    serve(['tickets.reply']);
    renderPage(<ReplyBox ticketId="t1" confirming />);
    expect(await screen.findByRole('button', { name: 'إرسال الردّ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إرسال الردّ وتأكيد الإغلاق' })).not.toBeInTheDocument();
  });

  it('shows no extra button on a ticket that is not waiting for the sender', async () => {
    serve(['tickets.reply', 'tickets.confirm_close']);
    renderPage(<ReplyBox ticketId="t1" />);
    expect(await screen.findByRole('button', { name: 'إرسال الردّ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إرسال الردّ وتأكيد الإغلاق' })).not.toBeInTheDocument();
  });
});
