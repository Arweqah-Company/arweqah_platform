import type { EmployeeFieldRuleDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { EmployeeFieldsPage } from './employee-fields-page';

const rules: EmployeeFieldRuleDto[] = [
  { field: 'personalPhone', group: 'contact', editableBySelf: true, editableByHr: true, selfLocked: false },
  { field: 'workLocation', group: 'work', editableBySelf: false, editableByHr: true, selfLocked: false },
  { field: 'iban', group: 'salary', editableBySelf: false, editableByHr: true, selfLocked: true },
];

function serve(keys: string[]) {
  const saved: unknown[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json({ ...me(keys.map((key) => ({ key, scope: 'all' as const }))), adminMode: { available: true, active: true, expiresAt: null } })),
    http.get('*/api/me/access', () => HttpResponse.json(access(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/employee-fields', () => HttpResponse.json(rules)),
    http.put('*/api/employee-fields', async ({ request }) => {
      saved.push(await request.json());
      return HttpResponse.json(rules);
    }),
  );
  return saved;
}

describe('Employee field permissions page (FR-94)', () => {
  it('shows who may change each field and keeps a field that can never be the employee’s locked', async () => {
    serve(['employee_fields.view', 'employee_fields.edit']);
    renderPage(<EmployeeFieldsPage />);
    expect(await screen.findByText('مقر العمل')).toBeInTheDocument();
    const self = await screen.findByRole('checkbox', { name: /الآيبان.*الموظف نفسه/ });
    expect(self).toBeDisabled();
    expect(await screen.findByRole('checkbox', { name: /الجوال الشخصي.*الموظف نفسه/ })).toBeChecked();
  });

  it('holds changes until «Save», then sends only the changed fields', async () => {
    const saved = serve(['employee_fields.view', 'employee_fields.edit']);
    renderPage(<EmployeeFieldsPage />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /مقر العمل.*الموظف نفسه/ }));
    expect(await screen.findByText('1 حقل تغيّر')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toEqual([{ rules: [{ field: 'workLocation', editableBySelf: true, editableByHr: true }] }]));
  });

  it('is read-only without the edit key', async () => {
    serve(['employee_fields.view']);
    renderPage(<EmployeeFieldsPage />);
    expect(await screen.findByRole('checkbox', { name: /مقر العمل.*الموظف نفسه/ })).toBeDisabled();
  });
});
