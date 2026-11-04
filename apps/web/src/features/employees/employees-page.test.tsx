import { CorePermission as P } from '@arweqah-platform/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { listItemFixture, serveEmployeeList } from '../../../test/employees-fixtures';
import { access, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { EmployeesPage } from './employees-page';

const person = listItemFixture;

function serve(keys: string[], items = [person()]) {
  serveEmployeeList(keys, items);
  renderRoute([{ path: '/employees', element: <EmployeesPage /> }, { path: '/employees/:id', element: <p>صفحة الموظف</p> }], '/employees');
}

describe('Employees list: row click and the actions column (FR-17)', () => {
  it('opens the employee from a click anywhere on the row', async () => {
    serve([P.EmployeesView]);
    fireEvent.click(await screen.findByText('N1'));
    expect(await screen.findByText('صفحة الموظف')).toBeInTheDocument();
  });

  it('puts view, edit and (de)activation in the last column, each with its key', async () => {
    serve([P.EmployeesView, P.EmployeesUpdate, P.EmployeesDeactivate]);
    const row = (await screen.findByText('N1')).closest('tr') as HTMLElement;
    expect(screen.getAllByRole('columnheader').at(-1)).toHaveTextContent('الإجراءات');
    expect(within(row).getByRole('link', { name: 'عرض' })).toHaveAttribute('href', '/employees/e1');
    expect(await within(row).findByRole('link', { name: 'تعديل' })).toHaveAttribute('href', '/employees/e1/edit');
    expect(within(row).getByRole('button', { name: 'تعطيل' })).toBeInTheDocument();
  });

  it('offers a plain employee (edit reaches only their own record) the edit of their own row alone', async () => {
    serve([], [person({ id: 'e1', employeeNumber: 'N1', isOwn: true }), person({ id: 'e2', employeeNumber: 'N2', isOwn: false })]);
    server.use(http.get('*/api/me/access', () => HttpResponse.json(access([{ key: P.EmployeesView, scope: 'subtree' as const }, { key: P.EmployeesUpdate, scope: 'own' as const }]))));
    const mine = (await screen.findByText('N1')).closest('tr') as HTMLElement;
    const other = screen.getByText('N2').closest('tr') as HTMLElement;
    expect(await within(mine).findByRole('link', { name: 'تعديل' })).toBeInTheDocument();
    expect(within(other).queryByRole('link', { name: 'تعديل' })).not.toBeInTheDocument();
  });

  it('shows no edit or deactivation without their keys, and "activate" for an inactive employee', async () => {
    serve([P.EmployeesView], [person({ isActive: false })]);
    const row = (await screen.findByText('N1')).closest('tr') as HTMLElement;
    expect(within(row).queryByRole('link', { name: 'تعديل' })).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /تعطيل|تفعيل/ })).not.toBeInTheDocument();
  });

  it('shows only the name of the unit, not its whole path', async () => {
    serve([P.EmployeesView], [person({ orgNode: { id: 'n1', nameAr: 'وحدة التدريب', nameEn: 'Training unit', pathAr: 'قطاع › إدارة › وحدة التدريب', pathEn: 'Sector › Department › Training unit' } })]);
    const row = (await screen.findByText('N1')).closest('tr') as HTMLElement;
    expect(within(row).getByText('وحدة التدريب')).toBeInTheDocument();
    expect(within(row).queryByText(/قطاع/)).not.toBeInTheDocument();
  });
});
