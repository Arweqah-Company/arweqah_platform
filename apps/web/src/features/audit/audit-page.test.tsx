import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { AuditPage } from './audit-page';

const entry = { id: 'a1', actorId: 'u1', actorName: 'سارة أحمد', action: 'task.created', entityType: 'task', entityId: '11111111-2222-3333-4444-555555555555', changes: { priority: 'high' }, ip: '10.0.0.7', createdAt: '2026-10-24T08:00:00.000Z' };

describe('Audit log: a click on a row opens its entry, and the actions column says "View"', () => {
  it('opens the entry in full from the row and from its action', async () => {
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/audit-logs', () => HttpResponse.json({ items: [entry], total: 1, page: 1, pageSize: 20 })),
    );
    renderPage(<AuditPage />);
    const row = (await screen.findByText('task.created')).closest('tr') as HTMLElement;
    expect(screen.getByRole('columnheader', { name: 'الإجراءات' })).toBeInTheDocument();
    fireEvent.click(within(row).getByText('سارة أحمد'));
    const dialog = await screen.findByRole('dialog', { name: 'قيد التدقيق' });
    expect(within(dialog).getByText(/"priority": "high"/)).toBeInTheDocument();
    expect(within(dialog).getByText('10.0.0.7')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إغلاق' }));
    fireEvent.click(within(row).getByRole('button', { name: 'عرض' }));
    expect(await screen.findByRole('dialog', { name: 'قيد التدقيق' })).toBeInTheDocument();
  });
});
