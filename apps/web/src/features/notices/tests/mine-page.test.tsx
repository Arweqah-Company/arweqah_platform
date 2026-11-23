import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { MyNoticesPage } from '../mine/mine-page';
import { mineItem } from './notices-fixtures';

const rows = [
  { ...mineItem({ id: 'm1', titleAr: 'سياسة السفر', myState: 'await', kind: 'policy' }), acknowledgedOlderVersion: false },
  { ...mineItem({ id: 'm2', titleAr: 'تعميم الإجازات', myState: 'done', kind: 'announcement' }), acknowledgedOlderVersion: false },
];

function serve() {
  const account = me([{ key: 'notices.view', scope: 'own' }, { key: 'notices.acknowledge', scope: 'own' }]);
  server.use(
    http.get('*/api/me', () => HttpResponse.json(account)),
    http.get('*/api/notices/mine', () => HttpResponse.json({ items: rows, total: 2, page: 1, pageSize: 20, counts: { await: 1 } })),
  );
}

describe('My notices: tabs and cards (FR-170)', () => {
  beforeEach(() => window.localStorage.clear());

  it('shows what I still owe as a count badge on its tab', async () => {
    serve();
    renderPage(<MyNoticesPage />);
    await screen.findByText('سياسة السفر');
    const tab = screen.getByRole('tab', { name: /بانتظار إقراري/ });
    expect(within(tab).getByText('1')).toBeInTheDocument();
    expect(tab.textContent).not.toMatch(/\(\d+\)/);
  });

  it('draws a notice card in the cards view: type, channel, state and the action that fits', async () => {
    serve();
    renderPage(<MyNoticesPage />);
    await screen.findByText('سياسة السفر');
    fireEvent.click(screen.getByRole('button', { name: 'بطاقات' }));
    const owed = await screen.findByRole('article', { name: 'سياسة السفر' });
    expect(within(owed).getByText('HR-ar')).toBeInTheDocument();
    expect(within(owed).getByRole('button', { name: 'قراءة وإقرار' })).toBeInTheDocument();
    const done = screen.getByRole('article', { name: 'تعميم الإجازات' });
    expect(within(done).getByRole('button', { name: 'قراءة' })).toBeInTheDocument();
  });
});
