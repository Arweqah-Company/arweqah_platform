import type { BulkUpdateInput, BulkUpdateResultDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { listItemFixture, serveEmployeeList } from '../../../test/employees-fixtures';
import { renderRoute } from '../../../test/render';
import { EmployeesPage } from './employees-page';

const items = [listItemFixture({ id: 'e1', employeeNumber: 'N1', fullName: 'خالد المدير' }), listItemFixture({ id: 'e2', employeeNumber: 'N2', fullName: 'سارة أحمد' })];

function serve(keys: string[], onBulk?: (input: BulkUpdateInput) => BulkUpdateResultDto) {
  serveEmployeeList(
    keys,
    items,
    http.get('*/api/lookups', () => HttpResponse.json({ relationTypes: [], countries: [], maritalStatuses: [], residencyStatuses: [], idTypes: [], contractTypes: [], gosiSystems: [], terminationReasons: [] })),
    http.get('*/api/lookups/companies', () => HttpResponse.json([{ id: 'c1', nameAr: 'أروقة الريادة', nameEn: 'Arweqah', code: 'ARW' }])),
    http.get('*/api/employees/managers', () => HttpResponse.json([])),
    ...(onBulk ? [http.post('*/api/employees/bulk-update', async ({ request }) => HttpResponse.json(onBulk((await request.json()) as BulkUpdateInput)))] : []),
  );
  renderRoute([{ path: '/employees', element: <EmployeesPage /> }], '/employees');
}

describe('Bulk edit from the employee list (FR-93)', () => {
  it('has no selection boxes without the bulk key', async () => {
    serve(['employees.view']);
    await screen.findByText('N1');
    expect(screen.queryByRole('checkbox', { name: 'تحديد هذا الصف' })).not.toBeInTheDocument();
  });

  it('selects rows, previews who would change and who would be refused with the reason, then applies', async () => {
    const calls: BulkUpdateInput[] = [];
    serve(['employees.view', 'employees.bulk_update', 'employees.update', 'employees.assign_change'], (input) => {
      calls.push(input);
      return { dryRun: input.dryRun, accepted: [{ id: 'e1', fullName: 'خالد المدير' }], rejected: [{ id: 'e2', fullName: 'سارة أحمد', code: 'NOT_FOUND', message: 'not found' }] };
    });
    await screen.findByText('N1');
    await screen.findAllByRole('checkbox', { name: 'تحديد هذا الصف' });
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'تحديد هذا الصف' })[0] as HTMLElement);
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'تحديد هذا الصف' })[1] as HTMLElement);
    expect(screen.getByText('2 موظف محدد')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تعديل جماعي' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'معاينة' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('مقر العمل'), { target: { value: 'جدة' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'معاينة' }));
    expect(await within(dialog).findByText('سيتغير 1')).toBeInTheDocument();
    expect(within(dialog).getByText('سيُرفض 1')).toBeInTheDocument();
    expect(within(dialog).getByText('سارة أحمد')).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ dryRun: true, workLocation: 'جدة', employeeIds: ['e1', 'e2'] });
    fireEvent.click(within(dialog).getByRole('button', { name: 'تطبيق على 1 موظف' }));
    await waitFor(() => expect(calls[1]).toMatchObject({ dryRun: false, workLocation: 'جدة' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('asks for the day and the reason as soon as a placement value is chosen', async () => {
    serve(['employees.view', 'employees.bulk_update'], () => ({ dryRun: true, accepted: [], rejected: [] }));
    await screen.findByText('N1');
    await screen.findAllByRole('checkbox', { name: 'تحديد هذا الصف' });
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'تحديد هذا الصف' })[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'تعديل جماعي' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByLabelText(/يسري من/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByLabelText('إزالة المدير المباشر'));
    expect(within(dialog).getByLabelText(/يسري من/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'معاينة' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/يسري من/), { target: { value: '2030-01-01' } });
    fireEvent.change(within(dialog).getByLabelText(/سبب التغيير/), { target: { value: 'إعادة هيكلة' } });
    expect(within(dialog).getByRole('button', { name: 'معاينة' })).toBeEnabled();
  });
});
