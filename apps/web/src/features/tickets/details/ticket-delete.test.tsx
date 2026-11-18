import type { TicketDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { useTicket } from '../api';
import { TicketActions } from './ticket-actions';

const ticket = (deleteAllowed: boolean) => ({ id: 't1', number: 12, title: 'الطابعة', relations: [], abilities: { reply: false, requestClose: false, closeWithoutExecution: true, confirmClose: false, declineClose: false, reopen: false, reassign: false, delete: deleteAllowed }, reopenDaysLeft: null }) as unknown as TicketDto;

function open(keys: string[], allowed: boolean) {
  let deleted = false;
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.delete('*/api/tickets/t1', () => { deleted = true; return new HttpResponse(null, { status: 204 }); }),
  );
  renderRoute([{ path: '/tickets/t1', element: <TicketActions ticket={ticket(allowed)} /> }, { path: '/tickets', element: <p>قائمة التذاكر</p> }], '/tickets/t1');
  return () => deleted;
}

describe('Deleting a ticket (FR-158)', () => {
  it('asks to confirm, deletes, and leaves the page for who holds the key and the API allows it', async () => {
    const deleted = open(['tickets.delete'], true);
    fireEvent.click(await screen.findByRole('button', { name: 'حذف' }));
    expect(deleted()).toBe(false);
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'حذف' }));
    await waitFor(() => expect(deleted()).toBe(true));
    expect(await screen.findByText('قائمة التذاكر')).toBeInTheDocument();
  });

  it('shows no «Delete» without the key, or when the API says the viewer may not', async () => {
    open(['tickets.close_without_execution'], true);
    expect(await screen.findByRole('button', { name: 'إغلاق دون تنفيذ' })).toBeInTheDocument(); // the buttons are there, «Delete» is not
    expect(screen.queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument();
  });

  it('shows no «Delete» when the API does not allow it, even with the key', async () => {
    open(['tickets.delete', 'tickets.close_without_execution'], false);
    expect(await screen.findByRole('button', { name: 'إغلاق دون تنفيذ' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument();
  });
});

/** The page of the open ticket: it holds the ticket's query, like the real details page does. */
function OpenPage() {
  const query = useTicket('t1');
  return query.data ? <TicketActions ticket={query.data} /> : <p>loading</p>;
}

describe('Deleting a ticket does not wait for a refetch of the deleted ticket (FR-158)', () => {
  it('never asks for the deleted ticket again (it would 404 and be retried for seconds) and leaves at once', async () => {
    let fetchesAfterDelete = 0;
    let deleted = false;
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/me/access', () => HttpResponse.json(access([{ key: 'tickets.delete', scope: 'all' as const }]))),
      http.get('*/api/tickets/t1', () => { if (deleted) { fetchesAfterDelete += 1; return HttpResponse.json({ code: 'TICKET_NOT_FOUND' }, { status: 404 }); } return HttpResponse.json(ticket(true)); }),
      http.delete('*/api/tickets/t1', () => { deleted = true; return new HttpResponse(null, { status: 204 }); }),
    );
    renderRoute([{ path: '/tickets/t1', element: <OpenPage /> }, { path: '/tickets', element: <p>قائمة التذاكر</p> }], '/tickets/t1');
    fireEvent.click(await screen.findByRole('button', { name: 'حذف' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حذف' }));
    expect(await screen.findByText('قائمة التذاكر')).toBeInTheDocument();
    expect(fetchesAfterDelete).toBe(0);
  });
});
