import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { chooseOption } from '../../../../test/select';
import { ChooseHandlerDialog } from './choose-handler-dialog';

const handlers = [{ id: 'u1', name: 'سارة أحمد' }, { id: 'u2', name: 'خالد علي' }];

describe('Choosing the handler of a ticket (FR-179)', () => {
  it('offers only the type\'s handlers, keeps the button off until one is chosen, and sends the choice', async () => {
    let sent: unknown = null;
    server.use(http.get('*/api/me', () => HttpResponse.json(me())), http.post('*/api/tickets/t1/handler', async ({ request }) => { sent = await request.json(); return HttpResponse.json({}); }));
    const closed = { done: false };
    renderPage(<ChooseHandlerDialog ticketId="t1" handlers={handlers} onClose={() => { closed.done = true; }} />);
    const confirm = await screen.findByRole('button', { name: 'تحديد المسؤول' });
    expect(confirm).toBeDisabled();
    await chooseOption(screen.getByRole('combobox'), 'u2');
    fireEvent.click(confirm);
    await vi.waitFor(() => expect(sent).toEqual({ handlerUserId: 'u2' }));
    await vi.waitFor(() => expect(closed.done).toBe(true));
  });

  it('shows the server\'s refusal inside the dialog and stays open', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me())), http.post('*/api/tickets/t1/handler', () => HttpResponse.json({ code: 'TICKET_CHOOSE_HANDLER', message: 'no' }, { status: 422 })));
    const closed = { done: false };
    renderPage(<ChooseHandlerDialog ticketId="t1" handlers={handlers} onClose={() => { closed.done = true; }} />);
    await chooseOption(await screen.findByRole('combobox'), 'u1');
    fireEvent.click(screen.getByRole('button', { name: 'تحديد المسؤول' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(closed.done).toBe(false);
  });
});
