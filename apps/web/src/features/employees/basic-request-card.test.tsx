import type { BasicRequestDto, EmployeeDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { access, me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { BasicRequestCard } from './basic-request-card';

const employee = (editable: string[]) => ({ id: 'e1', fullName: 'سارة أحمد', gender: 1, birthDate: '1995-04-02', editableFields: editable, names: { nationality: { nameAr: 'سعودي', nameEn: 'Saudi' }, maritalStatus: null } }) as unknown as EmployeeDto;
const request: BasicRequestDto = { id: 'r1', employeeId: 'e1', status: 'pending', values: { fullName: 'سارة مجدي', gender: 0 }, names: { nationality: null, maritalStatus: null }, rejectionReason: null, submittedAt: '2026-11-18T10:00:00Z', decidedAt: null };

function open(editable: string[], pending: BasicRequestDto | null = request) {
  const calls: { path: string; body: unknown }[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([{ key: 'employees.update', scope: 'all' }]))),
    http.get('*/api/me/access', () => HttpResponse.json(access([{ key: 'employees.update', scope: 'all' as const }]))),
    http.get('*/api/employees/e1/basic-request', () => (pending ? HttpResponse.json(pending) : new HttpResponse(null, { status: 200 }))),
    http.post('*/api/employees/e1/basic-request/:action', async ({ request: r, params }) => { calls.push({ path: String(params.action), body: await r.json() }); return HttpResponse.json({ ...request, status: 'approved' }); }),
  );
  renderPage(<BasicRequestCard employee={employee(editable)} />);
  return calls;
}

describe('HR decides a request to change basic data (FR-162)', () => {
  it('shows what changes and approves it', async () => {
    const calls = open(['fullName', 'gender']);
    expect(await screen.findByText('سارة مجدي')).toBeInTheDocument();
    expect(screen.getByText('سارة أحمد')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد' }));
    await waitFor(() => expect(calls).toEqual([{ path: 'approve', body: {} }]));
  });

  it('rejects with an optional reason', async () => {
    const calls = open(['fullName', 'gender']);
    fireEvent.click(await screen.findByRole('button', { name: 'رفض' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('سبب الرفض (اختياري)'), { target: { value: 'أرفق الهوية' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'رفض' }));
    await waitFor(() => expect(calls).toEqual([{ path: 'reject', body: { reason: 'أرفق الهوية' } }]));
  });

  it('offers no decision to someone who may not change every field asked for', async () => {
    open(['fullName']);
    expect(await screen.findByText(/لا تملك صلاحية تعديل كل الحقول/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'اعتماد' })).not.toBeInTheDocument();
  });

  it('shows nothing when no request waits', async () => {
    open(['fullName', 'gender'], null);
    await waitFor(() => expect(screen.queryByText('طلب تعديل البيانات الأساسية')).not.toBeInTheDocument());
  });
});
