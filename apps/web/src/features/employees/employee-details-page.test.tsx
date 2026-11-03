import type { EmployeeDto } from '@arweqah-platform/shared';
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { EmployeeDetailsPage } from './employee-details-page';

const company = { id: 'c1', nameAr: 'أروقة', nameEn: 'Arweqah' };
const NONE = { relationType: null, workCountry: null, nationality: null, maritalStatus: null, residencyStatus: null, idType: null, contractType: null, contractCompany: null, gosiCompany: null, healthInsuranceCompany: null, gosiSystem: null, terminationReason: null, salaryCurrency: null };
const mine = {
  id: 'e1', userId: 'u1', isActive: true, isSystemAccount: false, authenticatorEnabled: true, accessEndedAt: null, employeeNumber: 'N1', fullName: 'سارة أحمد', workEmail: 'sara@arweqah.sa',
  company, relationTypeId: 'r1', orgNode: null, jobTitle: null, manager: null, roles: [], groups: [], startDate: '2024-01-01', endDate: null, sensitiveHidden: true, notes: null,
  names: { ...NONE, relationType: { nameAr: 'موظف دائم', nameEn: 'Permanent' } },
} as unknown as EmployeeDto;

describe('Employee view page (FR-87)', () => {
  it('shows the names it was given and never loads the drop-down lists', async () => {
    const asked: string[] = [];
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me())),
      http.get('*/api/me/access', () => HttpResponse.json(access([{ key: 'employees.view', scope: 'own' }]))),
      http.get('*/api/employees/e1', () => HttpResponse.json(mine)),
      http.get('*/api/lookups*', ({ request }) => {
        asked.push(new URL(request.url).pathname);
        return HttpResponse.json([]);
      }),
    );
    renderRoute([{ path: '/employees/:id', element: <EmployeeDetailsPage /> }], '/employees/e1');
    expect(await screen.findByText('موظف دائم')).toBeInTheDocument();
    expect(asked).toEqual([]);
  });
});
