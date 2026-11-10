import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, roles, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { EmployeeFormPage } from './employee-form-page';

const SAVED = {
  id: 'e1', userId: 'u1', isActive: true, employeeNumber: 'N1', fullName: 'سارة أحمد', workEmail: 'sara@arweqah.sa', company: { id: '11111111-1111-4111-8111-111111111111', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' },
  relationTypeId: null, orgNode: { id: '22222222-2222-4222-8222-222222222222', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit' }, jobTitle: { id: '33333333-3333-4333-8333-333333333333', nameAr: 'مطور', nameEn: 'Developer' }, manager: null, roles: [], groups: [],
  workMode: 1, gender: 1, monthlyGrossSalary: null, isGosiRegistered: false, isQiwaContract: false, hasMedicalInsurance: false, startDate: '2024-01-01', endDate: null, sensitiveHidden: true, notes: null,
  names: { relationType: null, workCountry: null, nationality: null, maritalStatus: null, residencyStatus: null, idType: null, contractType: null, contractCompany: null, gosiCompany: null, healthInsuranceCompany: null, gosiSystem: null, terminationReason: null, salaryCurrency: null },
};

type Call = { method: string; url: string };

/** The form of a saved employee for a person who may give roles (so it has two steps). `reply` answers the save. */
function open(reply: () => Response, moreKeys: string[] = []) {
  const calls: Call[] = [];
  const bodies: Record<string, unknown>[] = [];
  const keys = ['employees.update', 'employees.view', 'employees.assign_roles', 'roles.view', ...moreKeys];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/lookups/companies', () => HttpResponse.json([{ id: '11111111-1111-4111-8111-111111111111', code: 'ARW', nameAr: 'أروقة الريادة', nameEn: 'Arweqah Alreyadah' }])),
    http.get('*/api/lookups/org-nodes', () => HttpResponse.json([{ id: '22222222-2222-4222-8222-222222222222', path: 'قطاع › وحدة', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit', nameAr: 'وحدة', nameEn: 'Unit', defaultManagerId: null }])),
    http.get('*/api/lookups/job-titles', () => HttpResponse.json([{ id: '33333333-3333-4333-8333-333333333333', name: 'مطور', nameAr: 'مطور', nameEn: 'Developer' }])),
    http.get('*/api/employees/managers', () => HttpResponse.json([])),
    http.get('*/api/roles', () => HttpResponse.json(roles)),
    http.get('*/api/employees/e1', () => HttpResponse.json(SAVED)),
    http.put('*/api/employees/e1', async ({ request }) => { calls.push({ method: request.method, url: new URL(request.url).pathname }); bodies.push((await request.json()) as Record<string, unknown>); return reply(); }),
  );
  renderRoute([{ path: '/employees/:id/edit', element: <EmployeeFormPage /> }], '/employees/e1/edit');
  return { calls, bodies };
}

/** Waits for the saved employee to fill the form, then presses «Next». */
const next = async () => {
  await waitFor(() => expect(screen.getByLabelText(/الاسم الكامل/)).toHaveValue('سارة أحمد'));
  fireEvent.click(await screen.findByRole('button', { name: 'التالي: الأدوار' }));
};

describe('The two steps of the employee form', () => {
  it('goes to the roles step on «Next» and saves nothing: the save button appears there, but only a press on it saves', async () => {
    const { calls } = open(() => HttpResponse.json(SAVED));
    await screen.findByRole('heading', { name: 'تعديل بيانات الموظف' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'الوحدة' })).toBeEnabled());
    await next();
    await new Promise((r) => setTimeout(r, 800));
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 300)); // a save started by the click itself would have been sent by now
    expect(calls).toEqual([]);
  });

  it('takes the person back to the first step with the reason when the server refuses a field of it while they were on the roles step', async () => {
    const { calls } = open(() => HttpResponse.json({ statusCode: 422, code: 'VALIDATION_ERROR', message: 'Validation failed', details: [{ path: ['workEmail'], message: 'البريد مستخدم لموظف آخر' }] }, { status: 422 }));
    await screen.findByRole('heading', { name: 'تعديل بيانات الموظف' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'الوحدة' })).toBeEnabled());
    await next();
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    const details = await screen.findByRole('heading', { level: 2, name: 'بيانات العمل' }); // the first step is showing again
    expect(details).toBeInTheDocument();
    expect(within(document.body).getByText('البريد مستخدم لموظف آخر')).toBeInTheDocument();
  });

  describe('«this employee leads the unit» (FR-100)', () => {
    it('is not offered to a person who may not appoint leaders', async () => {
      open(() => HttpResponse.json(SAVED));
      await screen.findByRole('heading', { name: 'تعديل بيانات الموظف' });
      await waitFor(() => expect(screen.getByLabelText(/الاسم الكامل/)).toHaveValue('سارة أحمد'));
      expect(screen.queryByLabelText('قائد هذه الوحدة')).not.toBeInTheDocument();
    });

    it('sends «leads the unit» with the save when it is ticked', async () => {
      const { bodies } = open(() => HttpResponse.json(SAVED), ['org.leaders_manage']);
      await screen.findByRole('heading', { name: 'تعديل بيانات الموظف' });
      await waitFor(() => expect(screen.getByLabelText(/الاسم الكامل/)).toHaveValue('سارة أحمد'));
      fireEvent.click(await screen.findByLabelText('قائد هذه الوحدة'));
      fireEvent.click(await screen.findByRole('button', { name: 'التالي: الأدوار' }));
      fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]).toMatchObject({ leadsUnit: true });
    });

    it('does not send it when it is not ticked', async () => {
      const { bodies } = open(() => HttpResponse.json(SAVED), ['org.leaders_manage']);
      await screen.findByRole('heading', { name: 'تعديل بيانات الموظف' });
      await waitFor(() => expect(screen.getByLabelText(/الاسم الكامل/)).toHaveValue('سارة أحمد'));
      await screen.findByLabelText('قائد هذه الوحدة');
      fireEvent.click(await screen.findByRole('button', { name: 'التالي: الأدوار' }));
      fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
      await waitFor(() => expect(bodies).toHaveLength(1));
      expect(bodies[0]).not.toHaveProperty('leadsUnit');
    });
  });
});
