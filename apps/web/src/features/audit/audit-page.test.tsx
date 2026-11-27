import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { AuditPage } from './audit-page';

const entry = { id: 'a1', actorId: 'u1', actorName: 'سارة أحمد', action: 'task.created', category: 'tasks', entityType: 'task', entityId: '11111111-2222-3333-4444-555555555555', changes: { priority: 'high' }, entityName: { ar: 'TSK-000007', en: 'TSK-000007' }, details: [{ label: { ar: 'الأولوية', en: 'Priority' }, value: { ar: 'عالية', en: 'High' } }], ip: '10.0.0.7', createdAt: '2026-10-24T08:00:00.000Z' };

describe('Audit log: a click on a row opens its entry, and the actions column says "View"', () => {
  it('opens the entry in full from the row and from its action', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/audit-logs', () => HttpResponse.json({ items: [entry], total: 1, page: 1, pageSize: 20 })),
    );
    renderPage(<AuditPage />);
    const row = (await screen.findByText('أنشأ مهمة')).closest('tr') as HTMLElement;
    expect(screen.getByRole('columnheader', { name: 'الإجراءات' })).toBeInTheDocument();
    fireEvent.click(within(row).getByText('سارة أحمد'));
    const dialog = await screen.findByRole('dialog', { name: 'قيد التدقيق' });
    expect(within(dialog).getByText('الأولوية')).toBeInTheDocument(); // the key as a label a person knows, the value in words
    expect(within(dialog).getByText('عالية')).toBeInTheDocument();
    expect(within(dialog).getAllByText('TSK-000007').length).toBeGreaterThan(0); // the record the entry is about
    expect(within(dialog).getByText(/"priority": "high"/)).toBeInTheDocument(); // the technical form stays for support
    expect(within(dialog).getByText('10.0.0.7')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إغلاق' }));
    fireEvent.click(within(row).getByRole('button', { name: 'عرض' }));
    expect(await screen.findByRole('dialog', { name: 'قيد التدقيق' })).toBeInTheDocument();
  });

  it('shows the action as a sentence and its category, never the technical name (FR-63)', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/audit-logs', () => HttpResponse.json({ items: [entry], total: 1, page: 1, pageSize: 20 })),
    );
    renderPage(<AuditPage />);
    const row = (await screen.findByText('أنشأ مهمة')).closest('tr') as HTMLElement;
    expect(within(row).getByText('المهام')).toBeInTheDocument();
    expect(screen.queryByText('task.created')).not.toBeInTheDocument();
  });

  it('has one tab per module over one table: «All» first, and a tab asks the API for that module only (FR-193)', async () => {
    const asked: URLSearchParams[] = [];
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/audit-logs', ({ request }) => { asked.push(new URL(request.url).searchParams); return HttpResponse.json({ items: [entry], total: 1, page: 1, pageSize: 20 }); }),
    );
    renderPage(<AuditPage />);
    const tabs = await screen.findByRole('tablist', { name: 'وحدات النظام' });
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['الكل', 'الدخول والأمان', 'الموظفون', 'الهيكل التنظيمي والشركات', 'الأدوار والصلاحيات', 'التذاكر', 'المهام', 'التعاميم والسياسات', 'إعدادات النظام', 'أخرى']);
    expect(within(tabs).getByRole('tab', { name: 'الكل' })).toHaveAttribute('aria-selected', 'true');
    expect(asked.at(-1)?.has('category')).toBe(false);
    fireEvent.click(within(tabs).getByRole('tab', { name: 'التذاكر' }));
    await vi.waitFor(() => expect(asked.at(-1)?.get('category')).toBe('tickets'));
    expect(within(tabs).getByRole('tab', { name: 'التذاكر' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(within(tabs).getByRole('tab', { name: 'الكل' }));
    await vi.waitFor(() => expect(asked.at(-1)?.has('category')).toBe(false));
  });

  it('no longer offers the category as a filter: the tabs are that choice', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/audit-logs', () => HttpResponse.json({ items: [entry], total: 1, page: 1, pageSize: 20 })),
    );
    renderPage(<AuditPage />);
    await screen.findByText('أنشأ مهمة');
    fireEvent.click(screen.getByRole('button', { name: /تصفية|الفلاتر/ }));
    expect(screen.queryByLabelText('الفئة')).not.toBeInTheDocument();
  });

  it('ties every tab to the one results area for a screen reader (the tab\'s aria-controls names the tab panel)', async () => {
    renderPage(<AuditPage />);
    const tabs = await screen.findByRole('tablist', { name: 'وحدات النظام' });
    const selected = within(tabs).getByRole('tab', { name: 'الكل' });
    const panel = await screen.findByRole('tabpanel');
    expect(selected).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', selected.id);
  });
});
