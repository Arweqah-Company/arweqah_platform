import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderPage, renderRoute } from '../../../../test/render';
import { AwaitingNoticesBanner } from '../shared/awaiting-banner';

const home = (awaiting: number) => http.get('*/api/notices/home', () => HttpResponse.json({ awaiting, pendingApproval: 0, pinned: null, awaitingTop: [], drafts: null }));

describe('The bar of waiting acknowledgements (FR-173)', () => {
  it('says how many notices wait and links to «My notices»', async () => {
    server.use(home(2));
    renderPage(<AwaitingNoticesBanner />);
    expect(await screen.findByText(/لديك 2 تعميم بانتظار إقرارك/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'عرض التعاميم' })).toHaveAttribute('href', '/notices');
  });

  it('is not drawn when nothing waits', async () => {
    server.use(home(0));
    renderPage(<AwaitingNoticesBanner />);
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByText('تنبيه')).not.toBeInTheDocument();
  });

  it('is not drawn on the notices pages themselves', async () => {
    server.use(home(2));
    renderRoute([{ path: '/notices', element: <AwaitingNoticesBanner /> }], '/notices');
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByText('تنبيه')).not.toBeInTheDocument();
  });
});
