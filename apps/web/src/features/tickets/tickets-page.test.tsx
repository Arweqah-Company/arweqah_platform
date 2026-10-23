import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
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
