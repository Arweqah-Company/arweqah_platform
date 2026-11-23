import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { ChannelsPage } from '../channels/channels-page';
import { channelOf, hr, serve } from './channel-fixtures';

describe('Publishing channels: adding, renaming and disabling (FR-177)', () => {
  beforeEach(() => window.localStorage.clear());

  it('fills the English name from the Arabic one while typing, and keeps what the person writes themselves', async () => {
    serve();
    server.use(http.post('*/api/translate', () => HttpResponse.json({ text: 'Legal affairs', source: 'ar', target: 'en' })));
    renderPage(<ChannelsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة قناة' }));
    fireEvent.change(await screen.findByLabelText(/الاسم بالعربية/), { target: { value: 'الشؤون القانونية' } });
    const en = screen.getByLabelText(/الاسم بالإنجليزية/);
    await waitFor(() => expect(en).toHaveValue('Legal affairs'));
    fireEvent.change(en, { target: { value: 'Legal' } });
    fireEvent.change(screen.getByLabelText(/الاسم بالعربية/), { target: { value: 'الشؤون القانونية والعقود' } });
    await new Promise((r) => setTimeout(r, 1000));
    expect(en).toHaveValue('Legal');
  });

  it('adds a channel: live validation, the unit from the list, and the request carries the names and the unit', async () => {
    const created = vi.fn();
    serve();
    server.use(
      http.get('*/api/notices/channels/units', () => HttpResponse.json([{ id: 'u9', nameAr: 'إدارة المشتريات', nameEn: 'Procurement' }])),
      http.post('*/api/notices/channels', async ({ request }) => { created(await request.json()); return HttpResponse.json(channelOf('procurement'), { status: 201 }); }),
    );
    renderPage(<ChannelsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة قناة' }));
    const submit = await screen.findByRole('button', { name: 'إضافة القناة' });
    expect(submit).toBeDisabled();
    const ar = screen.getByLabelText(/الاسم بالعربية/);
    fireEvent.change(ar, { target: { value: 'x' } });
    fireEvent.change(ar, { target: { value: '' } });
    fireEvent.blur(ar);
    expect(await screen.findByText('الاسم بالعربية مطلوب.')).toBeInTheDocument();
    fireEvent.change(ar, { target: { value: 'المشتريات' } });
    fireEvent.change(screen.getByLabelText(/الاسم بالإنجليزية/), { target: { value: 'Procurement channel' } });
    expect(submit).toBeDisabled(); // no unit yet
    fireEvent.click(screen.getByRole('combobox', { name: 'الوحدة' }));
    const option = await waitFor(() => { const el = [...document.querySelectorAll('[cmdk-item]')].find((x) => x.textContent?.includes('إدارة المشتريات')); if (!el) throw new Error('not listed'); return el; });
    fireEvent.click(option);
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(created).toHaveBeenCalledWith({ nameAr: 'المشتريات', nameEn: 'Procurement channel', unitId: 'u9' }));
  });

  it('shows the answer of the API when the name is taken (409)', async () => {
    serve();
    server.use(
      http.get('*/api/notices/channels/units', () => HttpResponse.json([{ id: 'u9', nameAr: 'إدارة المشتريات', nameEn: 'Procurement' }])),
      http.put('*/api/notices/channels/legal', () => HttpResponse.json({ code: 'NOTICE_CHANNEL_NAME_EXISTS', message: 'Another channel has this name' }, { status: 409 })),
    );
    renderPage(<ChannelsPage />);
    const row = (await screen.findByText('Legal affairs ar')).closest('tr') as HTMLElement;
    fireEvent.click(await within(row).findByRole('button', { name: 'تغيير الاسم' }));
    expect(await screen.findByText('وحدة القناة لا تتغير بعد إنشائها.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الاسم' }));
    expect(await screen.findByText('اسم القناة مستعمل لقناة أخرى.')).toBeInTheDocument();
  });

  it('asks before disabling (and says what happens to the writers) and sends the disable request', async () => {
    const disabled = vi.fn();
    serve();
    server.use(http.post('*/api/notices/channels/hr/disable', () => { disabled(); return HttpResponse.json({ ...hr, isActive: false }); }));
    renderPage(<ChannelsPage />);
    const row = (await screen.findByText('HR channel')).closest('tr') as HTMLElement;
    fireEvent.click(await within(row).findByRole('button', { name: 'تعطيل القناة' }));
    expect(await screen.findByText(/يفقد كتّابها \(2\) صلاحياتهم فورًا/)).toBeInTheDocument();
    expect(disabled).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'تعطيل' }));
    await waitFor(() => expect(disabled).toHaveBeenCalled());
  });
});
