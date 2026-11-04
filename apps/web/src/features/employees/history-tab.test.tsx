import type { EmployeeAssignmentDto, EmployeeChangeDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../test/msw';
import { openEmployeePage } from '../../../test/employees-fixtures';

const period = (over: Partial<EmployeeAssignmentDto>): EmployeeAssignmentDto => ({
  id: 'a1', field: 'org_node', valueId: 'n1', value: { nameAr: 'قطاع › وحدة', nameEn: 'Sector › Unit' }, validFrom: '2024-01-01', validTo: null, reason: 'Placement at the start of history', createdBy: null, createdByName: null, status: 'current', ...over,
});
const change: EmployeeChangeDto = { id: 'x1', action: 'employee.updated', actorName: 'مدير الموارد', fields: ['workLocation'], createdAt: '2025-01-02T10:00:00.000Z' };

const open = (keys: string[], periods: EmployeeAssignmentDto[], search = '?tab=history') =>
  openEmployeePage(keys, undefined, search,
    http.get('*/api/employees/e1/assignments', () => HttpResponse.json({ items: periods })),
    http.get('*/api/employees/e1/changes', () => HttpResponse.json({ items: [change], total: 1, page: 1, pageSize: 10 })));

describe("The employee's history tab (FR-90)", () => {
  it('shows the placement with names and the change log, in words', async () => {
    open(['employees.view', 'employees.history_view'], [period({}), period({ id: 'a2', field: 'manager', value: null, status: 'past' })]);
    expect(await screen.findByText('قطاع › وحدة')).toBeInTheDocument();
    expect(screen.getByText('سارٍ')).toBeInTheDocument();
    expect(screen.getByText('بلا مدير')).toBeInTheDocument();
    expect(await screen.findByText('عدّل بيانات موظف')).toBeInTheDocument();
    expect(screen.getByText('مقر العمل')).toBeInTheDocument();
    expect(screen.getByText('مدير الموارد')).toBeInTheDocument();
  });

  it('has no history tab without the history key', async () => {
    open(['employees.view'], [], '');
    await screen.findByRole('heading', { name: 'سارة أحمد' });
    expect(screen.queryByRole('tab', { name: 'السجل' })).not.toBeInTheDocument();
  });

  it('cancels a waiting change only for who may change placement, after a confirmation', async () => {
    let cancelled = '';
    server.use(http.delete('*/api/employees/e1/assignments/a3', () => { cancelled = 'a3'; return HttpResponse.json({ items: [] }); }));
    open(['employees.view', 'employees.history_view', 'employees.assign_change'], [period({ id: 'a3', status: 'pending', validFrom: '2099-01-01', reason: 'Transfer' })]);
    fireEvent.click(await screen.findByRole('button', { name: 'إلغاء التغيير' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء التغيير' }));
    await waitFor(() => expect(cancelled).toBe('a3'));
  });

  it('offers no cancel button without the change key', async () => {
    open(['employees.view', 'employees.history_view'], [period({ id: 'a4', status: 'pending', validFrom: '2099-01-01' })]);
    await screen.findByText('ينتظر يومه');
    expect(screen.queryByRole('button', { name: 'إلغاء التغيير' })).not.toBeInTheDocument();
  });
});
