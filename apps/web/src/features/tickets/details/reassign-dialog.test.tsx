import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { chooseOption } from '../../../../test/select';
import { ReassignDialog } from './reassign-dialog';

describe('Reassigning a ticket (FR-130)', () => {
  it('lists the people inside the reach, keeps the button off until one is chosen, and sends the choice', async () => {
    let sent: unknown = null;
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/tickets/t1/assignees', () => HttpResponse.json([{ id: 'u1', name: 'سارة أحمد' }])),
      http.post('*/api/tickets/t1/reassign', async ({ request }) => { sent = await request.json(); return HttpResponse.json({}); }),
    );
    const closed = { done: false };
    renderPage(<ReassignDialog ticketId="t1" onClose={() => { closed.done = true; }} />);
    const confirm = await screen.findByRole('button', { name: 'إعادة الإسناد' });
    expect(confirm).toBeDisabled();
    await chooseOption(screen.getByRole('combobox'), 'u1');
    fireEvent.click(confirm);
    await vi.waitFor(() => expect(sent).toEqual({ assigneeUserId: 'u1' }));
    await vi.waitFor(() => expect(closed.done).toBe(true));
  });
});
