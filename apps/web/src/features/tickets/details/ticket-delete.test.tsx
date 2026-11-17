import type { TicketDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
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
