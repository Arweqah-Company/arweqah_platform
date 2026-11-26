import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
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
