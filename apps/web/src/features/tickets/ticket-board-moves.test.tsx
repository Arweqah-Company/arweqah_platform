import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { ticketItem } from '../../../test/ticket-fixtures';
import { TicketsPage } from './tickets-page';

const byOther = (id: string, number: number, status: string) => ticketItem(id, number, status, { sender: { id: 'u9', name: 'خالد' } });
const menuOf = (number: number) => screen.findByLabelText(`انقل التذكرة «تذكرة ${number}» إلى`);

/** The board with these tickets, opened by the person `who`. */
async function openBoard(items: ReturnType<typeof ticketItem>[], who = me()) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(who)),
    http.get('*/api/tickets/options', () => HttpResponse.json({ desks: [], types: [], assignees: [], hasInbox: false, hasTeam: false })),
    http.get('*/api/tickets', () => HttpResponse.json({ items, total: items.length, page: 1, pageSize: 100, groupBy: null })),
  );
  renderPage(<TicketsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'لوحة كانبان', exact: true } as never));
}

/** What the action's route got, or the API's refusal when `status` is not 200. */
const answers = (path: string, calls: unknown[], status = 200) => http.post(`*/api/tickets/${path}`, async ({ request }) => {
  calls.push(await request.json());
  return status === 200 ? HttpResponse.json({}) : HttpResponse.json({ code: 'TICKET_STATE_INVALID', message: 'no' }, { status });
});

describe('Moving a card between the columns: the unit (FR-227)', () => {
  beforeEach(() => window.localStorage.clear());

  it('opens the window of closing without execution when an open ticket is moved to «closed», and sends the optional message', async () => {
    const calls: unknown[] = [];
    server.use(answers('a/close-without-execution', calls));
    await openBoard([byOther('a', 1, 'open')]);
    await chooseOption(await menuOf(1), 'closed');
    const dialog = await screen.findByRole('dialog', { name: 'إغلاق دون تنفيذ' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'رسالة (اختيارية)' }), { target: { value: 'خارج النطاق' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إغلاق دون تنفيذ' }));
    await waitFor(() => expect(calls).toEqual([{ message: 'خارج النطاق' }]));
  });

  it('lets the message stay empty', async () => {
    const calls: unknown[] = [];
    server.use(answers('a/request-close', calls));
    await openBoard([byOther('a', 1, 'open')]);
    await chooseOption(await menuOf(1), 'close_requested');
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'طلب إغلاق التذكرة' })).getByRole('button', { name: 'طلب الإغلاق' }));
    await waitFor(() => expect(calls).toEqual([{}]));
  });

  it('shows the API\'s refusal in the window and keeps the card in its column', async () => {
    server.use(answers('a/close-without-execution', [], 422));
    await openBoard([byOther('a', 1, 'open')]);
    await chooseOption(await menuOf(1), 'closed');
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'إغلاق دون تنفيذ' })).getByRole('button', { name: 'إغلاق دون تنفيذ' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'مفتوحة', hidden: true })).getByRole('link', { name: /تذكرة 1/, hidden: true })).toBeInTheDocument(); // under the window, still in its column
  });

  it('has no handle and no menu on a card the person holds no key to move, nor on a closed ticket they did not send', async () => {
    await openBoard([byOther('a', 1, 'open'), byOther('c', 4, 'closed')], me([], { without: ['tickets.request_close', 'tickets.close_without_execution'] }));
    await screen.findByRole('region', { name: 'مغلقة' });
    expect(screen.queryByLabelText(/اسحب التذكرة/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/انقل التذكرة/)).not.toBeInTheDocument();
  });
});

describe('Moving a card between the columns: the sender (FR-227)', () => {
  beforeEach(() => window.localStorage.clear());

  it('confirms a waiting ticket, or sends it back to «open», each in its own window', async () => {
    const calls: unknown[] = [];
    server.use(answers('w/confirm-close', calls), answers('w/decline-close', calls));
    await openBoard([ticketItem('w', 3, 'close_requested')]);
    await chooseOption(await menuOf(3), 'closed');
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'تأكيد تنفيذ الطلب' })).getByRole('button', { name: 'تأكيد وإغلاق' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await chooseOption(await menuOf(3), 'open');
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'رفض الإغلاق' })).getByRole('button', { name: 'إعادة فتحها' }));
    await waitFor(() => expect(calls).toHaveLength(2));
  });

  it('reopens a closed ticket the person sent', async () => {
    const calls: unknown[] = [];
    server.use(answers('c/reopen', calls));
    await openBoard([ticketItem('c', 5, 'closed')]);
    await chooseOption(await menuOf(5), 'open');
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'إعادة فتح التذكرة' })).getByRole('button', { name: 'إعادة الفتح' }));
    await waitFor(() => expect(calls).toEqual([{}]));
  });
});
