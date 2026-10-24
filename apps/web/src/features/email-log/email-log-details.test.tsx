import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { EmailLogPage } from './email-log-page';

const entry = { id: 'm1', to: 'sara@arweqah.sa', subject: 'مهمة جديدة TSK-000001', purpose: 'notification', status: 'failed', error: '550 mailbox unavailable', providerResponse: null, createdAt: '2026-10-24T08:00:00.000Z', sentAt: null };

describe('E-mail log: a click on a row opens the sent e-mail (FR-26)', () => {
  it('shows who, why, how it went and the server answer, never a body', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/email-logs', () => HttpResponse.json({ items: [entry], total: 1, page: 1, pageSize: 20 })),
    );
    renderPage(<EmailLogPage />);
    const row = (await screen.findByText('sara@arweqah.sa')).closest('tr') as HTMLElement;
    fireEvent.click(within(row).getByText('مهمة جديدة TSK-000001'));
    const dialog = await screen.findByRole('dialog', { name: 'البريد المرسل' });
    expect(within(dialog).getByText('550 mailbox unavailable')).toBeInTheDocument();
    expect(within(dialog).getByText('sara@arweqah.sa')).toBeInTheDocument();
  });
});
