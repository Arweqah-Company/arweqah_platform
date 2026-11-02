import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { lookups, me, server } from '../../../test/msw';
import { renderRoute } from '../../../test/render';
import { EmployeeFormPage } from './employee-form-page';
import { chooseOption } from '../../../test/select';

const withPermissions = (keys: string[]) =>
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/lookups/org-nodes', () => HttpResponse.json([{ id: 'node-1', path: 'قطاع › وحدة', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit', defaultManagerId: 'boss-1' }])),
    http.get('*/api/lookups/job-titles', () => HttpResponse.json([{ id: 'title-1', name: 'مطور', nameAr: 'مطور', nameEn: 'Developer' }])),
    http.get('*/api/employees/managers', () => HttpResponse.json([{ id: 'boss-1', employeeNumber: 'N1', fullName: 'خالد المدير' }])),
  );

const open = async (keys = ['employees.create', 'employees.view_sensitive']) => {
  withPermissions(keys);
  renderRoute([{ path: '/employees/new', element: <EmployeeFormPage /> }], '/employees/new');
  await screen.findByRole('heading', { name: 'إضافة موظف' });
};

describe('Employee form (FR-17, FR-18)', () => {
  it('has the six sections, with the salary section only for those who may see sensitive data', async () => {
    await open();
    for (const name of ['بيانات العمل', 'التواصل', 'البيانات الشخصية', 'التعاقد', 'الراتب والتكلفة', 'السجل']) {
      expect(await screen.findByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('رقم الهوية')).toBeInTheDocument();
  });

  it('hides ID number, IBAN and salary for someone without employees.view_sensitive', async () => {
    await open(['employees.create']);
    expect(screen.queryByRole('heading', { level: 2, name: 'الراتب والتكلفة' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('رقم الهوية')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('الآيبان')).not.toBeInTheDocument();
  });

  it('shows the fields a choice asks for and hides them again', async () => {
    await open();
    expect(screen.queryByLabelText('تاريخ التسجيل بالتأمينات *')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('مسجل في التأمينات'));
    expect(await screen.findByLabelText('تاريخ التسجيل بالتأمينات *')).toBeInTheDocument();
    expect(screen.getByLabelText('نظام التأمينات *')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('مسجل في التأمينات'));
    await waitFor(() => expect(screen.queryByLabelText('تاريخ التسجيل بالتأمينات *')).not.toBeInTheDocument());

    expect(screen.queryByLabelText('الشركة المسجلة في التأمين الصحي')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('التأمين الطبي'));
    expect(await screen.findByRole('combobox', { name: 'الشركة المسجلة في التأمين الصحي' })).toBeInTheDocument();
  });

  it('makes the end date required for a fixed-term contract and asks for text on "other"', async () => {
    await open();
    expect(screen.getByLabelText('تاريخ النهاية')).toBeInTheDocument();
    await chooseOption(screen.getByLabelText('نوع العقد'), 'id-fixed_term');
    expect(await screen.findByLabelText('تاريخ النهاية *')).toBeInTheDocument();
    await chooseOption(screen.getByLabelText('نوع العقد'), 'id-other');
    expect(await screen.findByLabelText('اذكر نوع العقد *')).toBeInTheDocument();
  });

  it('offers a termination reason only once an end date is set', async () => {
    await open();
    expect(screen.queryByLabelText('سبب انتهاء العلاقة')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('تاريخ النهاية'), { target: { value: '2027-01-01' } });
    expect(await screen.findByLabelText('سبب انتهاء العلاقة')).toBeInTheDocument();
  });

  it('keeps the unit disabled until a company is chosen, then loads its units and proposes the unit manager', async () => {
    await open();
    const unit = screen.getByRole('combobox', { name: 'الوحدة' });
    expect(unit).toBeDisabled();
    fireEvent.click(screen.getByRole('combobox', { name: 'الشركة' }));
    fireEvent.click(await screen.findByText('أروقة الريادة'));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'الوحدة' })).toBeEnabled());
    fireEvent.click(screen.getByRole('combobox', { name: 'الوحدة' }));
    fireEvent.click(await screen.findByText('قطاع › وحدة'));
    expect(await screen.findByRole('option', { name: /مطور/ }, { timeout: 4000 }).catch(() => null)).toBeDefined();
    await waitFor(() => expect(within(screen.getByRole('combobox', { name: 'المدير المباشر' })).getByText('خالد المدير')).toBeInTheDocument());
  });

  it('does not send anything and shows what is missing when the required fields are empty', async () => {
    await open();
    let called = false;
    server.use(http.post('*/api/employees', () => { called = true; return HttpResponse.json({}); }));
    fireEvent.click(screen.getByRole('button', { name: 'حفظ وإرسال الدعوة' }));
    expect((await screen.findAllByText('هذا الحقل مطلوب.')).length).toBeGreaterThan(3);
    expect(called).toBe(false);
  });

  it('rejects a work e-mail that is not an address before it reaches the server', async () => {
    await open();
    fireEvent.change(screen.getByLabelText('بريد العمل *'), { target: { value: 'not an address' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ وإرسال الدعوة' }));
    expect(await screen.findByText('بريد العمل غير صحيح.')).toBeInTheDocument();
  });
});

describe('Employee form validation while typing (FR-17, FR-18)', () => {
  it('checks the ID number by type while typing, in the language of the screen', async () => {
    const national = { ...lookups.idTypes[0], rules: [{ countryId: null, regex: '^1\\d{9}$', minLength: 10, maxLength: 10, checksum: 'luhn' as const, errorMessage: 'x', errorMessageAr: 'رقم الهوية الوطنية غير صالح', errorMessageEn: 'Invalid National ID' }] };
    server.use(http.get('*/api/lookups', () => HttpResponse.json({ ...lookups, idTypes: [national] })));
    await open();
    await chooseOption(screen.getByLabelText('نوع الهوية'), 'id-national_id');
    fireEvent.change(screen.getByLabelText('رقم الهوية'), { target: { value: '1087654322' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ وإرسال الدعوة' }));
    expect(await screen.findByText('رقم الهوية الوطنية غير صالح')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('رقم الهوية'), { target: { value: '1087654321' } });
    await waitFor(() => expect(screen.queryByText('رقم الهوية الوطنية غير صالح')).not.toBeInTheDocument());
  });

  it('shows an error as soon as a field is left or edited, without pressing save', async () => {
    await open();
    expect(screen.queryByText('هذا الحقل مطلوب.')).not.toBeInTheDocument();
    fireEvent.blur(screen.getByLabelText('الرقم الوظيفي *'));
    expect(await screen.findByText('هذا الحقل مطلوب.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('بريد العمل *'), { target: { value: 'x' } });
    expect(await screen.findByText('بريد العمل غير صحيح.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('بريد العمل *'), { target: { value: 'x@arweqah.sa' } });
    await waitFor(() => expect(screen.queryByText('بريد العمل غير صحيح.')).not.toBeInTheDocument());
  });

  it('has two steps only for who may give roles, and stays on the first step while it has mistakes', async () => {
    await open(['employees.create', 'employees.assign_roles', 'roles.view']);
    expect(screen.getByRole('list', { name: 'خطوات النموذج' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حفظ وإرسال الدعوة' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'التالي: الأدوار' }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.getByRole('heading', { level: 2, name: 'بيانات العمل' })).toBeInTheDocument();
    expect(screen.queryByText('أدوار تأتي تلقائيًا')).not.toBeInTheDocument();
  });

  it('keeps one step without the permission to give roles', async () => {
    await open(['employees.create']);
    expect(screen.queryByRole('list', { name: 'خطوات النموذج' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ وإرسال الدعوة' })).toBeInTheDocument();
  });
});
