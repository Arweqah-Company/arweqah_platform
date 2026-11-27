import { CorePermission } from '@arweqah-platform/shared';
import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { chooseOption } from '../../../../test/select';
import { ProblemReportSettingsTab } from './problem-report-settings-tab';

const TYPES = [{ typeId: 'ty1', nameAr: 'مشاكل المنصة', nameEn: 'Platform problems', deskNameAr: 'الدعم', deskNameEn: 'Support' }];
const OFF = { enabled: false, ticketTypeId: null, analyzeWithAi: true, sendImageToAi: false, maxPerHour: 10 };

function open(keys: string[], saved: unknown[] = []) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/problem-report-settings', () => HttpResponse.json(OFF)),
    http.get('*/api/problem-report-settings/types', () => HttpResponse.json(TYPES)),
    http.put('*/api/problem-report-settings', async ({ request }) => { const body = await request.json(); saved.push(body); return HttpResponse.json(body); }),
  );
  renderPage(<ProblemReportSettingsTab />);
}

describe('Problem report settings (FR-195)', () => {
  it('switches the button on with a chosen type and saves every choice', async () => {
    const saved: unknown[] = [];
    open([CorePermission.TicketsReportSettingsView, CorePermission.TicketsReportSettingsEdit], saved);
    fireEvent.click(await screen.findByRole('checkbox', { name: /تشغيل زر/ }));
    expect(screen.getByText('اختر نوعًا قبل التشغيل.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
    await chooseOption(screen.getByRole('combobox'), 'ty1');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await vi.waitFor(() => expect(saved).toEqual([{ enabled: true, ticketTypeId: 'ty1', analyzeWithAi: true, sendImageToAi: false, maxPerHour: 10 }]));
  });

  it('allows the picture to reach the AI only with the analysis on, and warns about it', async () => {
    open([CorePermission.TicketsReportSettingsView, CorePermission.TicketsReportSettingsEdit]);
    const image = await screen.findByRole('checkbox', { name: /السماح للذكاء الاصطناعي برؤية/ });
    fireEvent.click(image);
    expect(screen.getByText(/ستغادر المنصة إلى مزوّد الذكاء الاصطناعي/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /إظهار زر «حلّل بالذكاء الاصطناعي»/ }));
    expect(image).toBeDisabled();
    expect(image).not.toBeChecked();
  });

  it('checks the hourly limit stays between 1 and 60', async () => {
    open([CorePermission.TicketsReportSettingsView, CorePermission.TicketsReportSettingsEdit]);
    fireEvent.change(await screen.findByLabelText('أقصى عدد بلاغات للموظف في الساعة'), { target: { value: '61' } });
    expect(await screen.findByText('أدخل رقمًا صحيحًا بين 1 و60.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'حفظ' })).toBeDisabled();
  });

  it('shows the settings to someone who may only look, without a way to change them', async () => {
    open([CorePermission.TicketsReportSettingsView]);
    expect(await screen.findByRole('checkbox', { name: /تشغيل زر/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'حفظ' })).not.toBeInTheDocument();
  });
});
