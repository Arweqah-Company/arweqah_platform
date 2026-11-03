import type { EmployeeDto, PermissionScope } from '@arweqah-platform/shared';
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
    http.get('*/api/employees/e1', () => HttpResponse.json(mine)),
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

  it('locks the HR fields and keeps the phones, personal e-mail and English name open for a plain employee', async () => {
    await open('own');
    for (const label of ['الوحدة', 'المسمى الوظيفي *']) expect(screen.getByLabelText(label)).toBeDisabled();
    expect(screen.getByLabelText('تاريخ البداية *')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('جوال العمل')).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText('الجوال الشخصي')).not.toHaveAttribute('readonly');
  });

  it('leaves every field open for who may edit employees beyond their own record', async () => {
    await open('company');
    expect(screen.getByLabelText('تاريخ البداية *')).not.toHaveAttribute('readonly');
  });
});
