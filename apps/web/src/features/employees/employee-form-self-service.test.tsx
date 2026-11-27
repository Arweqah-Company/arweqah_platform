import { EMPLOYEE_FIELD_KEYS, type EmployeeDto, type PermissionScope } from '@arweqah-platform/shared';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { EmployeeFormPage } from './employee-form-page';

const ref = { id: 'c1', nameAr: 'أروقة', nameEn: 'Arweqah' };
const mine = { id: 'e1', userId: 'u1', employeeNumber: 'N1', fullName: 'سارة أحمد', workEmail: 'sara@arweqah.sa', company: ref, orgNode: null, jobTitle: { id: 't1', nameAr: 'مطور', nameEn: 'Dev' }, manager: null, relationTypeId: null, startDate: '2024-01-01', sensitiveHidden: true, roles: [], groups: [] } as unknown as EmployeeDto;

const asked: string[] = [];

async function open(scope: PermissionScope) {
  asked.length = 0;
  server.use(
    http.get('*/api/roles', ({ request }) => {
      asked.push(new URL(request.url).pathname);
      return HttpResponse.json([]);
    }),
    http.get('*/api/employees/managers', ({ request }) => {
      asked.push(new URL(request.url).pathname);
      return HttpResponse.json([]);
    }),
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/me/access', () => HttpResponse.json(access([{ key: 'employees.update', scope }, { key: 'employees.view', scope }]))),
    // The grants decide the fields: a plain employee's own grant lists four, a wider grant lists them all (FR-94).
    http.get('*/api/employees/e1', () => HttpResponse.json({ ...mine, editableFields: scope === 'own' ? ['workPhone', 'personalPhone', 'personalEmail', 'fullNameEn'] : EMPLOYEE_FIELD_KEYS })),
    http.get('*/api/lookups/org-nodes', () => HttpResponse.json([])),
    http.get('*/api/lookups/job-titles', () => HttpResponse.json([])),
  );
  renderRoute([{ path: '/employees/:id/edit', element: <EmployeeFormPage /> }], '/employees/e1/edit');
  await screen.findByRole('heading', { name: 'تعديل بيانات الموظف' });
}

describe('Employee form for one\'s own record (FR-83)', () => {
  it('does not ask for the roles or the managers of the company: the person may not choose either (FR-87)', async () => {
    await open('own');
    expect(asked).toEqual([]);
  });

  it('locks the fields the person\'s grant does not list and keeps the phones, personal e-mail and English name open', async () => {
    await open('own');
    for (const label of ['الوحدة', 'المسمى الوظيفي *']) expect(screen.getByLabelText(label)).toBeDisabled();
    expect(screen.getByLabelText('تاريخ البداية *')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('جوال العمل')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('الجوال الشخصي')).not.toHaveAttribute('readonly');
  });

  it('FR-202: says once, above the form, how many fields may be changed, and marks each locked field with a lock instead of repeating a sentence', async () => {
    await open('own');
    expect(screen.getByText(/يمكنك تعديل \d+ من \d+ حقلًا/)).toBeInTheDocument();
    expect(screen.queryAllByText(/لا تملك صلاحية تعديل هذا الحقل/, { selector: 'p' })).toHaveLength(0);
    const locks = screen.getAllByRole('img', { name: 'مقفل: لا تملك صلاحية تعديل هذا الحقل.' });
    expect(locks.length).toBeGreaterThan(10);
    expect(locks.length).toBeLessThan(EMPLOYEE_FIELD_KEYS.length);
    expect(screen.getByLabelText('تاريخ البداية *')).toHaveClass('read-only:border-dashed', 'read-only:bg-neutral-50');
    expect(screen.getByLabelText('الجوال الشخصي')).not.toHaveAttribute('readonly');
  });

  it('FR-202: the edit page says what editing does, not what creating does, and does not count the sections', async () => {
    await open('own');
    expect(screen.getByText('عدّل الحقول المتاحة لك ثم احفظ. لن يتغير حساب الدخول.')).toBeInTheDocument();
    expect(screen.queryByText(/يُنشأ حساب دخول/)).not.toBeInTheDocument();
    expect(screen.queryByText(/الأقسام الستة/)).not.toBeInTheDocument();
  });

  it('FR-202: a person who may change every field sees no notice and no lock', async () => {
    await open('company');
    expect(screen.queryByText(/يمكنك تعديل \d+ من \d+ حقلًا/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('img', { name: /مقفل/ })).toHaveLength(0);
  });

  it('leaves every field open for who may edit employees beyond their own record', async () => {
    await open('company');
    expect(screen.getByLabelText('تاريخ البداية *')).not.toHaveAttribute('readonly');
  });
});
