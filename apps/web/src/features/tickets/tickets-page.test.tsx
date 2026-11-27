import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption, optionLabels } from '../../../test/select';
import { TicketsPage } from './tickets-page';

const options = (extra: object) => ({ desks: [], types: [], assignees: [], hasInbox: false, hasTeam: false, ...extra });

function serve(extra: object) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/tickets/options', () => HttpResponse.json(options(extra))),
    http.get('*/api/tickets', () => HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20, groupBy: null })),
  );
}

describe('Tickets page tabs follow the scopes (FR-48)', () => {
  it('offers only "my tickets" to someone whose permissions stay on their own tickets', async () => {
    serve({});
    renderPage(<TicketsPage />);
    expect(await screen.findByRole('tab', { name: 'تذاكري' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'وارد الوحدة' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'تذاكر فريقي' })).not.toBeInTheDocument();
  });

  it('adds the inbox and the team tab when the scopes reach further', async () => {
    serve({ hasInbox: true, hasTeam: true });
    renderPage(<TicketsPage />);
    expect(await screen.findByRole('tab', { name: 'وارد الوحدة' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'تذاكر فريقي' })).toBeInTheDocument();
  });
});

const TICKET = { id: 't1', number: 5, title: 'الطابعة', status: 'open', closeReason: null, priority: 1, neededBy: '2026-12-01', isPersonal: false, deskId: 'd', deskNameAr: 'الدعم', deskNameEn: 'Support', typeId: 'y', typeNameAr: 'مشكلة', typeNameEn: 'Problem', sender: { id: 'u', name: 'سارة' }, assignee: null, createdAt: '2026-11-20T08:00:00.000Z', lastActivityAt: '2026-11-21T08:00:00.000Z', overdue: false, stale: false, isNew: true };

/** Serves the list and records what the page asked for, for someone who holds the given keys. */
function serveList(keys: string[]) {
  const asked: URLSearchParams[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/tickets/options', () => HttpResponse.json(options({}))),
    http.get('*/api/tickets', ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json({ items: [{ ...TICKET, details: 'نص التذكرة' }], total: 1, page: 1, pageSize: 20, groupBy: null });
    }),
  );
  return asked;
}

describe('Exporting the ticket list (FR-184)', () => {
  it('shows «Export» and asks for each ticket\'s text only to someone who holds tickets.export', async () => {
    const asked = serveList(['tickets.view', 'tickets.export']);
    renderPage(<TicketsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'تصدير' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('نص التذكرة')).toBeInTheDocument(); // the column of the ticket's text is offered
    await waitFor(() => expect(asked.some((q) => q.get('withDetails') === 'true')).toBe(true));
  });

  it('shows no «Export» and never asks for the text without the key', async () => {
    const asked = serveList(['tickets.view']);
    renderPage(<TicketsPage />);
    expect(await screen.findByText('الطابعة')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تصدير' })).not.toBeInTheDocument();
    expect(asked.length).toBeGreaterThan(0);
    expect(asked.every((q) => !q.has('withDetails'))).toBe(true);
  });
});

describe('Deleting a ticket from its row (FR-158, FR-185)', () => {
  const serveRows = (keys: string[], canDelete: boolean) => {
    let deleted = false;
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'own' as const }))))),
      http.get('*/api/tickets/options', () => HttpResponse.json(options({}))),
      http.get('*/api/tickets', () => HttpResponse.json({ items: deleted ? [] : [{ ...TICKET, canDelete }], total: deleted ? 0 : 1, page: 1, pageSize: 20, groupBy: null })),
      http.delete('*/api/tickets/t1', () => { deleted = true; return new HttpResponse(null, { status: 204 }); }),
    );
    return () => deleted;
  };

  it('shows a trash icon on the row of a ticket the API says may be deleted, asks to confirm, deletes and refreshes the list', async () => {
    const deleted = serveRows(['tickets.view', 'tickets.delete'], true);
    renderPage(<TicketsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'حذف' }));
    expect(deleted()).toBe(false);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حذف' }));
    await waitFor(() => expect(deleted()).toBe(true));
    await waitFor(() => expect(screen.queryByText('الطابعة')).not.toBeInTheDocument());
  });

  it('offers no trash icon when the API does not allow it for the row, or the person lacks the key', async () => {
    serveRows(['tickets.view', 'tickets.delete'], false);
    const first = renderPage(<TicketsPage />);
    expect(await screen.findByText('الطابعة')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument();
    first.unmount();
    serveRows(['tickets.view'], true);
    renderPage(<TicketsPage />);
    expect(await screen.findByText('الطابعة')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument();
  });

  it('orders by last activity at first, and the order list sends oldest or newest first (FR-210)', async () => {
    const asked = serveList([]);
    renderPage(<TicketsPage />);
    const order = await screen.findByLabelText('الترتيب');
    await waitFor(() => expect(asked.length).toBeGreaterThan(0));
    expect(asked[0]?.get('sort')).toBe('activity');
    expect(asked[0]?.get('dir')).toBe('desc');
    expect(order).toHaveTextContent('آخر نشاط (الأحدث أولًا)');
    expect(await optionLabels(order)).toEqual(['آخر نشاط (الأحدث أولًا)', 'الأحدث إنشاءً', 'الأقدم إنشاءً', 'الأقدم نشاطًا']);
    await chooseOption(order, 'created:asc');
    await waitFor(() => expect(asked.at(-1)?.get('sort')).toBe('created'));
    expect(asked.at(-1)?.get('dir')).toBe('asc');
    await chooseOption(screen.getByLabelText('الترتيب'), 'created:desc');
    await waitFor(() => expect(asked.at(-1)?.get('dir')).toBe('desc'));
    expect(asked.at(-1)?.get('sort')).toBe('created');
  });
});
