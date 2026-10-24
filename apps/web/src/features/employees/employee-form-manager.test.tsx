import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { EmployeeFormPage } from './employee-form-page';

function serve(employee?: object) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(['employees.create', 'employees.update', 'employees.view'].map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/lookups/org-nodes', () =>
      HttpResponse.json([
        { id: 'node-1', path: 'قطاع › وحدة', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit', defaultManagerId: 'boss-1' },
        { id: 'node-2', path: 'قطاع › وحدة ثانية', pathAr: 'قطاع › وحدة ثانية', pathEn: 'Sector › Second unit', defaultManagerId: 'boss-1' },
      ]),
    ),
    http.get('*/api/lookups/job-titles', () => HttpResponse.json([{ id: 'title-1', name: 'مطور', nameAr: 'مطور', nameEn: 'Developer' }])),
    http.get('*/api/employees/managers', () => HttpResponse.json([{ id: 'boss-1', employeeNumber: 'N1', fullName: 'خالد المدير' }])),
    ...(employee ? [http.get('*/api/employees/e1', () => HttpResponse.json(employee))] : []),
  );
}

describe('The direct manager is optional in the employee form (FR-17, FR-18)', () => {
  it('can be cleared after the unit proposed it, and the unit does not propose it again', async () => {
    serve();
    renderRoute([{ path: '/employees/new', element: <EmployeeFormPage /> }], '/employees/new');
    await screen.findByRole('heading', { name: 'إضافة موظف' });
    fireEvent.click(screen.getByRole('combobox', { name: 'الشركة' }));
    fireEvent.click(await screen.findByText('أروقة الريادة'));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'الوحدة' })).toBeEnabled());
    fireEvent.click(screen.getByRole('combobox', { name: 'الوحدة' }));
    fireEvent.click(await screen.findByText('قطاع › وحدة'));
    const manager = () => screen.getByRole('combobox', { name: 'المدير المباشر' });
    await waitFor(() => expect(within(manager()).getByText('خالد المدير')).toBeInTheDocument());
    fireEvent.click(within(manager().parentElement as HTMLElement).getByRole('button', { name: 'مسح الاختيار' }));
    await waitFor(() => expect(within(manager()).queryByText('خالد المدير')).not.toBeInTheDocument());
    // Choosing another unit proposes nothing once the person cleared the manager by hand.
    fireEvent.click(screen.getByRole('combobox', { name: 'الوحدة' }));
    fireEvent.click(await screen.findByText('قطاع › وحدة ثانية'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(within(manager()).queryByText('خالد المدير')).not.toBeInTheDocument();
    expect(screen.queryByText('المدير المباشر *')).not.toBeInTheDocument();
  });
});
