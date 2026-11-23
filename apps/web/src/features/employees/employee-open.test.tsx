import { CorePermission as P } from '@arweqah-platform/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { employeeFixture, listItemFixture, openEmployeePage, serveEmployeeList } from '../../../test/employees-fixtures';
import { renderRoute } from '../../../test/render';
import { EmployeesPage } from './employees-page';

describe("Opening an employee: the row's eye, the page's buttons and its details follow the API's reach (FR-178)", () => {
  it('draws the eye and opens on a click only for the rows the API marks openable', async () => {
    serveEmployeeList([P.EmployeesView, P.EmployeesOpen], [listItemFixture({ id: 'e1', employeeNumber: 'N1', canOpen: true }), listItemFixture({ id: 'e2', employeeNumber: 'N2', canOpen: false })]);
    renderRoute([{ path: '/employees', element: <EmployeesPage /> }, { path: '/employees/:id', element: <p>صفحة الموظف</p> }], '/employees');
    const mine = (await screen.findByText('N1')).closest('tr') as HTMLElement;
    const other = screen.getByText('N2').closest('tr') as HTMLElement;
    expect(within(mine).getByRole('link', { name: 'عرض' })).toBeInTheDocument();
    expect(within(other).queryByRole('link', { name: 'عرض' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('N2'));
    expect(screen.queryByText('صفحة الموظف')).not.toBeInTheDocument();
  });

  it("hides the photo buttons and the history tab on a record the keys do not reach, even for who holds the keys at «own»", async () => {
    openEmployeePage(['employees.view', 'employees.photo_update', 'employees.history_view'], employeeFixture({ canChangePhoto: false, canViewHistory: false }));
    await screen.findByRole('heading', { name: 'سارة أحمد' });
    expect(screen.queryByRole('button', { name: 'إضافة صورة' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'السجل' })).not.toBeInTheDocument();
  });

  it('shows only the details the open key lists: the others are not drawn, and a card with none of them disappears', async () => {
    openEmployeePage(['employees.view'], employeeFixture({ visibleFields: ['workPhone', 'fullName', 'employeeNumber', 'companyId'], workPhone: '0500000000', personalPhone: null, sensitiveHidden: false }));
    expect(await screen.findByText('0500000000')).toBeInTheDocument();
    expect(screen.queryByText('تاريخ الميلاد')).not.toBeInTheDocument();
    expect(screen.queryByText('الهاتف الشخصي')).not.toBeInTheDocument();
    expect(screen.queryByText('الراتب والحساب')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'الأدوار' })).not.toBeInTheDocument();
  });

  it('opens a short page in a pop-up with the Teams chat button, and a full page by navigation', async () => {
    serveEmployeeList([P.EmployeesView, P.EmployeesOpen, P.DirectoryContactTeams], [listItemFixture({ id: 'e1', employeeNumber: 'N1', openAs: 'dialog' }), listItemFixture({ id: 'e2', employeeNumber: 'N2', openAs: 'page' })], http.get('*/api/employees/e1', () => HttpResponse.json(employeeFixture({ workEmail: 'k@arweqah.sa', visibleFields: ['workPhone'] }))));
    renderRoute([{ path: '/employees', element: <EmployeesPage /> }, { path: '/employees/:id', element: <p>صفحة الموظف</p> }], '/employees');
    fireEvent.click(await screen.findByText('N1'));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('link', { name: /Teams/ })).toHaveAttribute('href', expect.stringContaining('k%40arweqah.sa'));
    expect(screen.queryByText('صفحة الموظف')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'إغلاق' }).at(-1) as HTMLElement);
    fireEvent.click(await screen.findByText('N2'));
    expect(await screen.findByText('صفحة الموظف')).toBeInTheDocument();
  });
});
