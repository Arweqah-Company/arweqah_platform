import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { SecuritySettingsTab } from './security-settings-tab';

const open = (keys = ['security_settings.view', 'security_settings.edit']) => {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/security-settings', () => HttpResponse.json({ trustedDeviceDays: 0, requestsPerMinute: 600, impersonationEnabled: 0, impersonationIdleMinutes: 30, agentEnabled: 1, agentMessagesPerHour: 30, agentDraftMinutes: 30, adminModeRequiresCode: 1, maxUploadMb: 10 })),
  );
  renderPage(<SecuritySettingsTab />);
};

describe('Security settings tab (FR-73, FR-76)', () => {
  it('lets an administrator switch off the authenticator code of admin mode (for testing), with a warning, and saves it (FR-34)', async () => {
    let saved: Record<string, number> | undefined;
    server.use(http.put('*/api/security-settings', async ({ request }) => { saved = (await request.json()) as Record<string, number>; return HttpResponse.json(saved); }));
    open();
    const box = await screen.findByRole('checkbox', { name: /اشتراط رمز تطبيق المصادقة لتفعيل وضع المدير/ });
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(await screen.findByText(/وضع المدير يعمل الآن بلا رمز/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved?.adminModeRequiresCode).toBe(0));
  });

  it('shows the numbers, checks their range, and saves them', async () => {
    let saved: Record<string, number> | undefined;
    server.use(http.put('*/api/security-settings', async ({ request }) => { saved = (await request.json()) as Record<string, number>; return HttpResponse.json(saved); }));
    open();
    const days = await screen.findByLabelText('أيام الجهاز الموثوق');
    expect(days).toHaveValue(0);
    fireEvent.change(days, { target: { value: '400' } });
    expect(await screen.findByText('أدخل رقمًا صحيحًا بين 0 و365.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
    fireEvent.change(days, { target: { value: '30' } });
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toEqual({ trustedDeviceDays: 30, requestsPerMinute: 600, impersonationEnabled: 0, impersonationIdleMinutes: 30, agentEnabled: 1, agentMessagesPerHour: 30, agentDraftMinutes: 30, adminModeRequiresCode: 1, maxUploadMb: 10 }));
  });

  it('switches «sign in as» on, checks its idle minutes, and saves both (FR-85)', async () => {
    let saved: Record<string, number> | undefined;
    server.use(http.put('*/api/security-settings', async ({ request }) => { saved = (await request.json()) as Record<string, number>; return HttpResponse.json(saved); }));
    open();
    const switcher = await screen.findByLabelText('السماح لمديري النظام بالدخول بحساب موظف آخر', { exact: false });
    expect(switcher).not.toBeChecked();
    fireEvent.click(switcher);
    const minutes = screen.getByLabelText('الدقائق بلا نشاط قبل انتهاء الجلسة');
    expect(minutes).toHaveValue(30);
    fireEvent.change(minutes, { target: { value: '2' } });
    expect(await screen.findByText('أدخل رقمًا صحيحًا بين 5 و240.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
    fireEvent.change(minutes, { target: { value: '45' } });
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toEqual({ trustedDeviceDays: 0, requestsPerMinute: 600, impersonationEnabled: 1, impersonationIdleMinutes: 45, agentEnabled: 1, agentMessagesPerHour: 30, agentDraftMinutes: 30, adminModeRequiresCode: 1, maxUploadMb: 10 }));
  });

  it('shows the assistant numbers, checks their range and saves them (FR-147)', async () => {
    let saved: Record<string, number> | undefined;
    server.use(http.put('*/api/security-settings', async ({ request }) => { saved = (await request.json()) as Record<string, number>; return HttpResponse.json(saved); }));
    open();
    const perHour = await screen.findByLabelText('عدد رسائل الموظف في الساعة');
    expect(perHour).toHaveValue(30);
    fireEvent.change(perHour, { target: { value: '2' } });
    expect(await screen.findByText('أدخل رقمًا صحيحًا بين 5 و300.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
    fireEvent.change(perHour, { target: { value: '60' } });
    fireEvent.change(screen.getByLabelText('دقائق انتظار التأكيد على الطلب'), { target: { value: '15' } });
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toMatchObject({ agentMessagesPerHour: 60, agentDraftMinutes: 15 }));
  });

  it('FR-150: the assistant has an on/off check box, on by default, saved with the other numbers', async () => {
    let saved: Record<string, number> | undefined;
    server.use(http.put('*/api/security-settings', async ({ request }) => { saved = (await request.json()) as Record<string, number>; return HttpResponse.json(saved); }));
    open();
    const box = await screen.findByLabelText('تفعيل مساعد المنصة', { exact: false });
    expect(box).toBeChecked();
    fireEvent.click(box);
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved).toMatchObject({ agentEnabled: 0, agentMessagesPerHour: 30, agentDraftMinutes: 30, adminModeRequiresCode: 1, maxUploadMb: 10 }));
  });

  it('is read-only without the edit key', async () => {
    open(['security_settings.view']);
    expect(await screen.findByLabelText('أيام الجهاز الموثوق')).toBeDisabled();
    expect(screen.getByLabelText('السماح لمديري النظام بالدخول بحساب موظف آخر', { exact: false })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument();
  });
});

describe('Allowed e-mail domains (FR-77)', () => {
  it('shows the list one domain per line, names what is not a domain, and saves the rest lower-cased', async () => {
    let saved: unknown;
    server.use(
      http.get('*/api/security-settings/email-domains', () => HttpResponse.json({ domains: ['arweqah.sa'] })),
      http.put('*/api/security-settings/email-domains', async ({ request }) => { saved = await request.json(); return HttpResponse.json(saved as Record<string, string[]>); }),
    );
    open();
    const box = await screen.findByLabelText('نطاقات البريد المسموحة');
    expect(box).toHaveValue('arweqah.sa');
    fireEvent.change(box, { target: { value: 'arweqah.sa\nPartner.ORG\nnot a domain' } });
    expect(await screen.findByText('ليست نطاقات صحيحة: not a domain')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'حفظ' }).at(-1)).toBeDisabled();
    fireEvent.change(box, { target: { value: 'arweqah.sa\nPartner.ORG' } });
    const buttons = screen.getAllByRole('button', { name: 'حفظ' });
    fireEvent.click(buttons[buttons.length - 1] as HTMLElement);
    await waitFor(() => expect(saved).toEqual({ domains: ['arweqah.sa', 'partner.org'] }));
  });

  it('sets the largest attachment, checks it stays between 1 and 100 MB, and saves it for every file box (FR-191)', async () => {
    let saved: Record<string, number> | undefined;
    server.use(http.put('*/api/security-settings', async ({ request }) => { saved = (await request.json()) as Record<string, number>; return HttpResponse.json(saved); }));
    open();
    const size = await screen.findByLabelText('أكبر حجم لمرفق (ميغابايت)');
    expect(size).toHaveValue(10);
    fireEvent.change(size, { target: { value: '101' } });
    expect(await screen.findByText('أدخل رقمًا صحيحًا بين 1 و100.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
    fireEvent.change(size, { target: { value: '50' } });
    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(saved?.maxUploadMb).toBe(50));
  });

  it('shows the size to someone who may only look, without a way to change it', async () => {
    open(['security_settings.view']);
    expect(await screen.findByLabelText('أكبر حجم لمرفق (ميغابايت)')).toBeDisabled();
  });
});
