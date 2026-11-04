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
        { id: 'node-1', path: 'قطاع › وحدة', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit', nameAr: 'وحدة', nameEn: 'Unit', defaultManagerId: 'boss-1' },
        { id: 'node-2', path: 'قطاع › وحدة ثانية', pathAr: 'قطاع › وحدة ثانية', pathEn: 'Sector › Second unit', nameAr: 'وحدة ثانية', nameEn: 'Second unit', defaultManagerId: 'boss-1' },
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
    fireEvent.click(await screen.findByText('وحدة'));
    const manager = () => screen.getByRole('combobox', { name: 'المدير المباشر' });
    await waitFor(() => expect(within(manager()).getByText('خالد المدير')).toBeInTheDocument());
    fireEvent.click(within(manager().parentElement as HTMLElement).getByRole('button', { name: 'مسح الاختيار' }));
    await waitFor(() => expect(within(manager()).queryByText('خالد المدير')).not.toBeInTheDocument());
    // Choosing another unit proposes nothing once the person cleared the manager by hand.
    fireEvent.click(screen.getByRole('combobox', { name: 'الوحدة' }));
    fireEvent.click(await screen.findByText('وحدة ثانية'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(within(manager()).queryByText('خالد المدير')).not.toBeInTheDocument();
    expect(screen.queryByText('المدير المباشر *')).not.toBeInTheDocument();
  });
});

describe('A change of unit, title or manager asks from which day and why (FR-89)', () => {
  const saved = {
    id: 'e1', userId: 'u1', isActive: true, employeeNumber: 'N1', fullName: 'سارة أحمد', workEmail: 'sara@arweqah.sa', company: { id: 'c1', nameAr: 'أروقة', nameEn: 'Arweqah' },
    relationTypeId: null, orgNode: { id: 'node-1', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit' }, jobTitle: { id: 'title-1', nameAr: 'مطور', nameEn: 'Developer' }, manager: null, roles: [], groups: [],
    startDate: '2024-01-01', endDate: null, sensitiveHidden: true, notes: null,
    names: { relationType: null, workCountry: null, nationality: null, maritalStatus: null, residencyStatus: null, idType: null, contractType: null, contractCompany: null, gosiCompany: null, healthInsuranceCompany: null, gosiSystem: null, terminationReason: null, salaryCurrency: null },
  };

  it('shows the day and the reason fields only once the unit is changed', async () => {
    serve(saved);
    renderRoute([{ path: '/employees/:id/edit', element: <EmployeeFormPage /> }], '/employees/e1/edit');
    await screen.findByRole('heading', { name: 'تعديل بيانات الموظف' });
    expect(screen.queryByLabelText(/يسري من/)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'الوحدة' })).toBeEnabled());
    fireEvent.click(screen.getByRole('combobox', { name: 'الوحدة' }));
    fireEvent.click(await screen.findByText('وحدة ثانية'));
    const day = (await screen.findByLabelText(/يسري من/)) as HTMLInputElement;
    expect(day.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByLabelText(/سبب التغيير/)).toBeInTheDocument();
  });
});
