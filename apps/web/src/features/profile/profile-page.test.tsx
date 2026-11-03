import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import type { EmployeeDto, OwnProfileDto } from '@arweqah-platform/shared';
import { access, me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { ProfilePage } from './profile-page';

const employee = {
  id: 'e1', employeeNumber: 'E-1042', fullName: 'سارة أحمد', fullNameEn: 'Sara Ahmed', workEmail: 'sara@arweqah.sa', personalEmail: null, personalPhone: null, startDate: '2024-03-01',
  company: { id: 'c1', nameAr: 'أروقة الريادة', nameEn: 'Arweqah' }, orgNode: { id: 'u1', nameAr: 'وحدة', nameEn: 'Unit', pathAr: 'قطاع › وحدة', pathEn: 'Sector › Unit' },
  jobTitle: { id: 't1', nameAr: 'مطورة', nameEn: 'Developer' }, manager: { id: 'm1', fullName: 'خالد' }, updatedAt: '2026-10-22T10:00:00Z',
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

  it('saves the three contact details, nothing else', async () => {
    let body: unknown;
    server.use(http.put('*/api/me/profile', async ({ request }) => { body = await request.json(); return HttpResponse.json(profile()); }));
    open();
    fireEvent.change(await screen.findByLabelText('الجوال الشخصي'), { target: { value: '+966501234567' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    await waitFor(() => expect(body).toEqual({ personalPhone: '+966501234567', personalEmail: null, fullNameEn: 'Sara Ahmed' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a wrong phone or name before sending anything', async () => {
    let sent = false;
    server.use(http.put('*/api/me/profile', () => { sent = true; return HttpResponse.json(profile()); }));
    open();
    fireEvent.change(await screen.findByLabelText('الجوال الشخصي'), { target: { value: '0501234567' } });
    fireEvent.change(screen.getByLabelText('الاسم بالإنجليزية'), { target: { value: 'اسم عربي' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    expect(await screen.findByText('اكتب الجوال بالصيغة الدولية، مثل +966501234567.')).toBeInTheDocument();
    expect(screen.getByText('حروف إنجليزية ومسافات فقط.', { selector: 'p' })).toBeInTheDocument();
    expect(sent).toBe(false);
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
});
