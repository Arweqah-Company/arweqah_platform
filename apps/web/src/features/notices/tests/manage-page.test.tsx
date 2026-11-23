import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { ManageNoticesPage } from '../manage/manage-page';
import { listItem, noAbilities } from './notices-fixtures';

const rows = [
  listItem('n1', { status: 'draft', abilities: { ...noAbilities, edit: true, submit: true, delete: true } }),
  listItem('n2', { status: 'published', publishedAt: '2026-11-10T00:00:00.000Z', abilities: { ...noAbilities, pin: true, revise: true, archive: true } }),
  listItem('n3', { status: 'pending_approval', hiddenForRevision: true, version: 2, abilities: { ...noAbilities, reviseCancel: true } }),
];

function serve(keys: { key: string; scope: 'own' | 'subtree' | 'all' }[]) {
  const account = me(keys);
  server.use(
    http.get('*/api/me', () => HttpResponse.json(account)),
    http.get('*/api/notices/options', () => HttpResponse.json({ channels: [], writableChannelCodes: [], authors: [] })),
    http.get('*/api/notices/audience/options', () => HttpResponse.json({ units: [], titles: [], groups: [] })),
    http.get('*/api/notices', () => HttpResponse.json({ items: rows, total: 3, page: 1, pageSize: 20, counts: { mine: 1, pending: 1 } })),
  );
}

const ALL = ['notices.manage_view', 'notices.create', 'notices.edit', 'notices.submit', 'notices.delete', 'notices.pin', 'notices.revise', 'notices.revise_cancel', 'notices.archive'].map((key) => ({ key, scope: 'own' as const }));

describe('Manage notices: row icons follow the state and the keys (FR-167, FR-171, FR-176)', () => {
  beforeEach(() => window.localStorage.clear());

  it('gives each row only the icons its state allows, and marks a hidden new version', async () => {
    serve(ALL);
    renderPage(<ManageNoticesPage />);
    const draft = (await screen.findByText('Notice n1')).closest('tr') as HTMLElement;
    await within(draft).findByRole('button', { name: 'حذف' });
    for (const name of ['عرض', 'تعديل', 'إرسال للاعتماد', 'حذف']) expect(within(draft).getByRole('button', { name })).toBeInTheDocument();
    expect(within(draft).queryByRole('button', { name: 'أرشفة' })).not.toBeInTheDocument();
    const published = screen.getByText('Notice n2').closest('tr') as HTMLElement;
    for (const name of ['تثبيت في الرئيسية', 'تعديل بإصدار جديد', 'أرشفة']) expect(within(published).getByRole('button', { name })).toBeInTheDocument();
    const revising = screen.getByText('Notice n3').closest('tr') as HTMLElement;
    expect(within(revising).getByRole('button', { name: 'إلغاء التعديل وإعادة القديم' })).toBeInTheDocument();
    expect(within(revising).getByText('قيد التعديل · مخفي عن الموظفين')).toBeInTheDocument();
  });

  it('hides an icon whose key the person does not hold, and the «New notice» button', async () => {
    serve([{ key: 'notices.manage_view', scope: 'own' }]);
    renderPage(<ManageNoticesPage />);
    const draft = (await screen.findByText('Notice n1')).closest('tr') as HTMLElement;
    expect(await within(draft).findByRole('button', { name: 'عرض' })).toBeInTheDocument();
    expect(within(draft).queryByRole('button', { name: 'تعديل' })).not.toBeInTheDocument();
    expect(within(draft).queryByRole('button', { name: 'حذف' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تعميم جديد' })).not.toBeInTheDocument();
  });

  it('keeps one view switch, remembered: cards after the choice', async () => {
    serve(ALL);
    renderPage(<ManageNoticesPage />);
    await screen.findByText('Notice n1');
    expect(screen.getAllByRole('group', { name: 'طريقة العرض' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'بطاقات' }));
    expect(window.localStorage.getItem('view:notices-manage')).toBe('cards');
  });

  it('shows the tab counters as count badges, not as text in the label', async () => {
    serve(ALL);
    renderPage(<ManageNoticesPage />);
    await screen.findByText('Notice n1');
    const tab = screen.getByRole('tab', { name: /بانتظار الاعتماد/ });
    expect(within(tab).getByText('1')).toBeInTheDocument();
    expect(tab.textContent).not.toMatch(/\(\d+\)/);
  });
});
