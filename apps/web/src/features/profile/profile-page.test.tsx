import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { EmployeeDto, OwnProfileDto } from '@arweqah-platform/shared';
import { access, me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { ProfilePage } from './profile-page';

const employee = {
  id: 'e1', employeeNumber: 'E-1042', fullName: 'سارة أحمد', fullNameEn: 'Sara Ahmed', workEmail: 'sara@arweqah.sa', personalEmail: null, personalPhone: null, startDate: '2024-03-01',
  company: { id: 'c1', nameAr: 'أروقة الريادة', nameEn: 'Arweqah' }, orgNode: { id: 'u1', nameAr: 'وحدة', nameEn: 'Unit', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit' },
  gender: 1, birthDate: '1995-04-02', names: { nationality: { nameAr: 'سعودي', nameEn: 'Saudi' }, maritalStatus: { nameAr: 'متزوجة', nameEn: 'Married' } },
  jobTitle: { id: 't1', nameAr: 'مطورة', nameEn: 'Developer' }, manager: { id: 'm1', fullName: 'خالد' }, updatedAt: '2026-10-22T10:00:00Z', editableFields: ['personalPhone', 'personalEmail', 'fullNameEn'],
} as unknown as EmployeeDto;
const profile = (over: Partial<OwnProfileDto> = {}): OwnProfileDto => ({ preferences: { locale: 'ar', theme: 'system' }, employee, ...over });

function open(data: OwnProfileDto = profile()) {
  server.use(http.get('*/api/me', () => HttpResponse.json(me([]))), http.get('*/api/me/profile', () => HttpResponse.json(data)));
  renderPage(<ProfilePage />);
}

describe('Profile page (FR-33)', () => {
  it('shows the appearance settings, the contact form and the job details read-only', async () => {
    open();
    expect(await screen.findByRole('heading', { level: 2, name: 'بيانات التواصل' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'حسب الجهاز' })).toBeChecked();
    expect(screen.getByText('E-1042')).toBeInTheDocument();
    expect(screen.getByText('قطاع › وحدة')).toBeInTheDocument();
    expect(screen.getByLabelText('الاسم بالإنجليزية')).toHaveValue('Sara Ahmed');
    expect(screen.getByRole('link', { name: /الأمان وتطبيق المصادقة/ })).toHaveAttribute('href', '/security');
  });

  it('shows the basic personal data read-only (FR-33)', async () => {
    open();
    expect(await screen.findByRole('heading', { level: 2, name: 'البيانات الأساسية' })).toBeInTheDocument();
    for (const text of ['أنثى', 'سعودي', '1995-04-02', 'متزوجة']) expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('saves the two contact details, nothing else', async () => {
    let body: unknown;
    server.use(http.put('*/api/me/profile', async ({ request }) => { body = await request.json(); return HttpResponse.json(profile()); }));
    open();
    fireEvent.change(await screen.findByLabelText('الجوال الشخصي'), { target: { value: '+966501234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    await waitFor(() => expect(body).toEqual({ personalPhone: '+966501234567', personalEmail: null }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('FR-202: the English name sits in the basic data beside the Arabic name, is still editable and saves on its own', async () => {
    let body: unknown;
    server.use(http.put('*/api/me/profile', async ({ request }) => { body = await request.json(); return HttpResponse.json(profile()); }));
    open();
    const basic = (await screen.findByRole('heading', { level: 2, name: 'البيانات الأساسية' })).closest('section') as HTMLElement;
    const field = within(basic).getByLabelText('الاسم بالإنجليزية');
    expect(field).toHaveValue('Sara Ahmed');
    expect(within(basic).getByText('الاسم بالعربية')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حفظ الاسم' })).not.toBeInTheDocument();
    fireEvent.change(field, { target: { value: 'Sara Ali Ahmed' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الاسم' }));
    await waitFor(() => expect(body).toEqual({ fullNameEn: 'Sara Ali Ahmed' }));
  });

  it('FR-204: the empty phone box hints with a pattern, not a number that looks saved, in a colour apart from a typed value', async () => {
    open();
    const phone = await screen.findByLabelText('الجوال الشخصي');
    expect(phone).toHaveValue('');
    expect(phone).toHaveAttribute('placeholder', '+9665XXXXXXXX');
    expect(phone).toHaveClass('placeholder:text-neutral-500');
    expect(phone).not.toHaveClass('placeholder:text-fg');
  });

  it('explains a wrong phone before sending anything', async () => {
    let sent = false;
    server.use(http.put('*/api/me/profile', () => { sent = true; return HttpResponse.json(profile()); }));
    open();
    fireEvent.change(await screen.findByLabelText('الجوال الشخصي'), { target: { value: '0501234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    expect(await screen.findByText('اكتب الجوال بالصيغة الدولية، مثل +966501234567.')).toBeInTheDocument();
    expect(sent).toBe(false);
  });

  it('explains a wrong English name and keeps its save button off', async () => {
    open();
    const field = await screen.findByLabelText('الاسم بالإنجليزية');
    fireEvent.change(field, { target: { value: 'اسم عربي' } });
    fireEvent.blur(field);
    expect(await screen.findByText('حروف إنجليزية ومسافات فقط.', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ الاسم' })).toBeDisabled();
  });

  describe('the profile follows the employee page: one list of editable fields (FR-222)', () => {
    const without = (keep: string[]) => profile({ employee: { ...employee, editableFields: keep } });

    it('locks a contact detail the grant of «edit employees» does not give, and sends only the open ones', async () => {
      let body: unknown;
      server.use(http.put('*/api/me/profile', async ({ request }) => { body = await request.json(); return HttpResponse.json(profile()); }));
      open(without(['personalEmail']));
      const phone = await screen.findByLabelText('الجوال الشخصي');
      expect(phone).toHaveAttribute('readonly');
      expect(screen.getByLabelText('الاسم بالإنجليزية')).toHaveAttribute('readonly');
      fireEvent.change(screen.getByLabelText('البريد الشخصي'), { target: { value: 'sara@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
      await waitFor(() => expect(body).toEqual({ personalEmail: 'sara@example.com' }));
    });

    it('has no save button when no contact detail is open', async () => {
      open(without([]));
      await screen.findByLabelText('الجوال الشخصي');
      expect(screen.queryByRole('button', { name: 'حفظ التغييرات' })).not.toBeInTheDocument();
    });

    it('sends the person to the employee page for the basic details their grant gives, and asks HR only for the rest', async () => {
      const asker = [{ key: 'profile.update_basic', scope: 'all' as const }];
      server.use(http.get('*/api/me', () => HttpResponse.json(me(asker))), http.get('*/api/me/access', () => HttpResponse.json(access(asker))), http.get('*/api/lookups', () => HttpResponse.json({ countries: [], maritalStatuses: [] })), http.get('*/api/me/profile/basic-request', () => new HttpResponse(null, { status: 200 })));
      open(without(['birthDate', 'gender']));
      expect(await screen.findByRole('link', { name: 'تعديل في صفحة الموظف' })).toHaveAttribute('href', '/employees/e1/edit');
      fireEvent.click(await screen.findByRole('button', { name: 'طلب تعديل' }));
      expect(await screen.findByLabelText('الاسم بالعربية')).toBeInTheDocument();
      expect(screen.queryByLabelText('تاريخ الميلاد')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('الجنس')).not.toBeInTheDocument();
    });

    it('offers no request when every basic detail can be changed directly', async () => {
      const asker = [{ key: 'profile.update_basic', scope: 'all' as const }];
      server.use(http.get('*/api/me', () => HttpResponse.json(me(asker))), http.get('*/api/me/access', () => HttpResponse.json(access(asker))), http.get('*/api/me/profile/basic-request', () => new HttpResponse(null, { status: 200 })));
      open(without(['fullName', 'gender', 'nationalityId', 'birthDate', 'maritalStatusId']));
      expect(await screen.findByRole('link', { name: 'تعديل في صفحة الموظف' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'طلب تعديل' })).not.toBeInTheDocument();
    });
  });

  it('shows only the appearance settings for an account with no employee record', async () => {
    open(profile({ employee: null }));
    expect(await screen.findByText(/لا يوجد سجل موظف مرتبط بحسابك/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'بيانات التواصل' })).not.toBeInTheDocument();
  });

  it('choosing a theme saves it on the account', async () => {
    let body: unknown;
    server.use(http.put('*/api/me/profile', async ({ request }) => { body = await request.json(); return HttpResponse.json(profile()); }));
    // Saving needs `profile.update`, which arrives with the permissions a moment after the page: wait for them before choosing.
    const permissionsRead = new Promise<void>((resolve) => server.use(http.get('*/api/me/access', () => { resolve(); return HttpResponse.json(access()); })));
    open();
    const dark = await screen.findByRole('radio', { name: 'داكن' });
    await permissionsRead;
    await act(async () => undefined);
    fireEvent.click(dark);
    await waitFor(() => expect(body).toEqual({ theme: 'dark' }));
  });

  describe('asking to change the basic data (FR-162)', () => {
    const asker = [{ key: 'profile.update_basic', scope: 'all' as const }];
    const serve = (request: unknown) => server.use(
      http.get('*/api/me', () => HttpResponse.json(me(asker))),
      http.get('*/api/me/access', () => HttpResponse.json(access(asker))),
      http.get('*/api/me/profile', () => HttpResponse.json(profile())),
      http.get('*/api/lookups', () => HttpResponse.json({ countries: [], maritalStatuses: [] })),
      http.get('*/api/me/profile/basic-request', () => (request ? HttpResponse.json(request) : new HttpResponse(null, { status: 200 }))),
    );

    it('offers no button without the key', async () => {
      server.use(http.get('*/api/me/access', () => HttpResponse.json(access([{ key: 'profile.view', scope: 'all' as const }]))));
      open();
      await screen.findByRole('heading', { level: 2, name: 'البيانات الأساسية' });
      expect(screen.queryByRole('button', { name: 'طلب تعديل' })).not.toBeInTheDocument();
    });

    it('sends only the fields that changed', async () => {
      let body: unknown;
      serve(null);
      server.use(http.put('*/api/me/profile/basic-request', async ({ request }) => { body = await request.json(); return HttpResponse.json({ id: 'r1', employeeId: 'e1', status: 'pending', values: body, names: { nationality: null, maritalStatus: null }, rejectionReason: null, submittedAt: '2026-11-18T10:00:00Z', decidedAt: null }); }));
      renderPage(<ProfilePage />);
      fireEvent.click(await screen.findByRole('button', { name: 'طلب تعديل' }));
      const send = await screen.findByRole('button', { name: 'إرسال الطلب' });
      expect(send).toBeDisabled();
      fireEvent.change(screen.getByLabelText('الاسم بالعربية'), { target: { value: 'سارة مجدي' } });
      fireEvent.click(send);
      await waitFor(() => expect(body).toEqual({ fullName: 'سارة مجدي' }));
    });

    it('shows a waiting request with a cancel button instead of the request button, and a rejection with its reason', async () => {
      const pending = { id: 'r1', employeeId: 'e1', status: 'pending', values: { fullName: 'اسم جديد' }, names: { nationality: null, maritalStatus: null }, rejectionReason: null, submittedAt: '2026-11-18T10:00:00Z', decidedAt: null };
      let cancelled = false;
      serve(pending);
      server.use(http.delete('*/api/me/profile/basic-request', () => { cancelled = true; return new HttpResponse(null, { status: 204 }); }));
      renderPage(<ProfilePage />);
      expect(await screen.findByText('طلبك ينتظر الموارد البشرية')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'طلب تعديل' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'إلغاء الطلب' }));
      await waitFor(() => expect(cancelled).toBe(true));
    });

    it('tells the employee when HR rejected, with the reason', async () => {
      serve({ id: 'r1', employeeId: 'e1', status: 'rejected', values: { fullName: 'x' }, names: { nationality: null, maritalStatus: null }, rejectionReason: 'أرفق الهوية', submittedAt: '2026-11-18T10:00:00Z', decidedAt: '2026-11-18T11:00:00Z' });
      renderPage(<ProfilePage />);
      expect(await screen.findByText(/رفضت الموارد البشرية طلب تعديلك/)).toBeInTheDocument();
      expect(screen.getByText(/أرفق الهوية/)).toBeInTheDocument();
    });
  });
});
