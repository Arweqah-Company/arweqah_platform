import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { EmailLogPage } from './email-log-page';

const row = (over: object) => ({ id: '1', to: 'a@arweqah.sa', subject: 'فعّل حسابك', purpose: 'activation', status: 'sent', error: null, providerResponse: '250 OK', createdAt: '2026-10-21T10:00:00Z', sentAt: '2026-10-21T10:00:01Z', ...over });

describe('Sent e-mail log page (FR-26)', () => {
  it('shows each e-mail with its status and the failure reason', async () => {
    server.use(http.get('*/api/email-logs', () => HttpResponse.json({
      items: [row({}), row({ id: '2', to: 'b@arweqah.sa', status: 'failed', error: '535 Authentication unsuccessful', providerResponse: null })],
      total: 2, page: 1, pageSize: 20,
    })));
    renderPage(<EmailLogPage />);
    expect(await screen.findByText('a@arweqah.sa')).toBeInTheDocument();
    expect(screen.getByText('تم الإرسال', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('فشل', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('535 Authentication unsuccessful')).toBeInTheDocument();
  });

  it('shows an error state when the list cannot be loaded', async () => {
    server.use(http.get('*/api/email-logs', () => HttpResponse.json({ message: 'x' }, { status: 500 })));
    renderPage(<EmailLogPage />);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
