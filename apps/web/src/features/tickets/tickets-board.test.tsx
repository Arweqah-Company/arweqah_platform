import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { TicketsPage } from './tickets-page';

const ticket = (id: string, number: number, status: string) => ({
  id, number, title: `تذكرة ${number}`, status, closeReason: null, priority: 0, neededBy: '2026-11-01', isPersonal: false,
  deskId: 'd1', deskNameAr: 'الدعم', deskNameEn: 'Support', typeId: 't1', typeNameAr: 'عطل', typeNameEn: 'Fault',
  sender: { id: 'u1', name: 'سارة' }, assignee: null, createdAt: '2026-10-01', lastActivityAt: '2026-10-01', overdue: false, stale: false, isNew: true,
});

describe('Tickets Kanban board (FR-48)', () => {
  beforeEach(() => window.localStorage.clear());

  it('puts every ticket in the column of its status, as a link to the ticket', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/tickets/options', () => HttpResponse.json({ desks: [], types: [], assignees: [], hasInbox: false, hasTeam: false })),
      http.get('*/api/tickets', () => HttpResponse.json({ items: [ticket('a', 1, 'open'), ticket('b', 2, 'closed')], total: 2, page: 1, pageSize: 100, groupBy: null })),
    );
    renderPage(<TicketsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'لوحة كانبان', exact: true } as never));
    const closed = await screen.findByRole('region', { name: 'مغلقة' });
    expect(within(closed).getByRole('link', { name: /تذكرة 2/ })).toHaveAttribute('href', '/tickets/b');
    expect(within(screen.getByRole('region', { name: 'مفتوحة' })).getByRole('link', { name: /تذكرة 1/ })).toBeInTheDocument();
  });

  it('offers exactly three views: table, Kanban board and cards', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/tickets/options', () => HttpResponse.json({ desks: [], types: [], assignees: [], hasInbox: false, hasTeam: false })),
      http.get('*/api/tickets', () => HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 20, groupBy: null })),
    );
    renderPage(<TicketsPage />);
    const group = await screen.findByRole('group', { name: 'طريقة العرض' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent || b.getAttribute('aria-label'))).toEqual(['جدول', 'لوحة كانبان', 'بطاقات']);
  });
});
