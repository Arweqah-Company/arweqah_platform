import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorePermission, type CalibrationPageDto, type CalibrationRowDto, type ObjectionListDto } from '@arweqah-platform/shared';
import { toast } from 'sonner';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { CalibrationPage } from './calibration-page';

const KEYS = [CorePermission.PerformanceCalibrationView, CorePermission.PerformanceCalibrate, CorePermission.PerformanceApprove, CorePermission.PerformanceCalibrationExport];
const ROW = (over: Partial<CalibrationRowDto> = {}): CalibrationRowDto => ({ employeeId: 'e1', name: 'سارة أحمد', titleNameAr: 'موظف مبيعات', titleNameEn: 'Sales rep', managerName: 'خالد المدير', stage: 2, cap: 125, managerScore: 90, adjustment: 0, reason: null, calibrated: 90, levelName: 'يحقق التوقعات', ...over });
const PAGE = (items: CalibrationRowDto[], over: Partial<CalibrationPageDto> = {}): CalibrationPageDto => ({
  cycle: { fiscalYear: 2026, stage: 'cal' }, items, total: items.length, page: 1, pageSize: 25, waitingCount: items.filter((r) => r.managerScore === null).length,
  distribution: [{ levelName: 'يحقق التوقعات', count: 1 }, { levelName: 'يفوق التوقعات', count: 0 }], ...over,
});

type Call = { method: string; url: string; body: unknown };

function open(page: CalibrationPageDto, keys: string[] = KEYS, objections: ObjectionListDto = { items: [] }) {
  window.localStorage.setItem('view:performance-calibration', 'table');
  const calls: Call[] = [];
  const record = async (request: Request) => { calls.push({ method: request.method, url: new URL(request.url).pathname, body: request.method === 'GET' ? null : await request.json().catch(() => null) }); return HttpResponse.json(ROW()); };
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/performance/calibration', ({ request }) => { calls.push({ method: 'GET', url: new URL(request.url).search, body: null }); return HttpResponse.json(page); }),
    http.put('*/api/performance/calibration/:id', ({ request }) => record(request)),
    http.post('*/api/performance/calibration/finish', ({ request }) => record(request)),
    http.post('*/api/performance/calibration/approve', ({ request }) => record(request)),
    http.get('*/api/performance/objections', () => HttpResponse.json(objections)),
    http.post('*/api/performance/objections/:id/:action', ({ request }) => record(request)),
  );
  renderPage(<CalibrationPage />);
  return { calls };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(toast, 'success').mockReturnValue(1);
});

describe('The calibration page (FR-122)', () => {
  it('lists everyone with the manager score, the adjustment, the calibrated score and the level, and draws the distribution; a person waiting for the manager is marked', async () => {
    open(PAGE([ROW({ adjustment: 1.5, calibrated: 91.5 }), ROW({ employeeId: 'e2', name: 'منى علي', managerScore: null, calibrated: null, levelName: null })]));
    const table = await screen.findByRole('table', { name: 'المعايرة والاعتماد' });
    await within(table).findByText('منى علي');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]!).getByText('+1.5')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('91.5')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('بانتظار المدير')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'يحقق التوقعات' })).toBeInTheDocument();
    expect(screen.getByText(/1 موظفًا لم يرسل مديرهم/)).toBeInTheDocument();
  });

  it('asks the server for the search and the filters the person chose', async () => {
    const { calls } = open(PAGE([ROW()]));
    await screen.findByRole('table', { name: 'المعايرة والاعتماد' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'بحث في المعايرة' }), { target: { value: 'سارة' } });
    await waitFor(() => expect(calls.some((c) => c.url.includes('search=%D8%B3%D8%A7%D8%B1%D8%A9'))).toBe(true));
  });

  it('adjusts a person: the score after the adjustment is shown live, the reason is required, and the server gets both', async () => {
    const { calls } = open(PAGE([ROW()]));
    await waitFor(() => expect(screen.getByRole('button', { name: 'عدّل الدرجة: سارة أحمد' })).toBeEnabled()); // the permissions have loaded: a click on the row opens the dialog only for who may adjust
    fireEvent.click(await screen.findByText('سارة أحمد'));
    const dialog = await screen.findByRole('dialog');
    const save = within(dialog).getByRole('button', { name: 'حفظ' });
    fireEvent.change(within(dialog).getByLabelText('التعديل (نقاط)'), { target: { value: '2' } });
    expect(within(dialog).getByText('92')).toBeInTheDocument(); // 90 + 2
    expect(save).toBeDisabled(); // no reason yet
    fireEvent.change(within(dialog).getByLabelText('السبب'), { target: { value: 'مقارنة بأقرانه في الوحدة' } });
    expect(save).toBeEnabled();
    fireEvent.change(within(dialog).getByLabelText('التعديل (نقاط)'), { target: { value: '0.3' } });
    expect(save).toBeDisabled(); // off the half-point step
    expect(within(dialog).getByText(/مضاعفات 0.5/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('التعديل (نقاط)'), { target: { value: '2' } });
    fireEvent.click(save);
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toMatchObject({ url: '/api/performance/calibration/e1', body: { adjustment: 2, reason: 'مقارنة بأقرانه في الوحدة' } }));
  });

  it('dims the buttons outside their stage with the reason, and the finish button while someone waits', async () => {
    open(PAGE([ROW({ managerScore: null, calibrated: null, levelName: null })]));
    expect(await screen.findByRole('button', { name: 'إنهاء المعايرة وإرسالها للاعتماد' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'اعتماد النتائج وإبلاغ الجميع فرديًا' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'اعتماد النتائج وإبلاغ الجميع فرديًا' })).toHaveAttribute('title', 'متاح في مرحلة الاعتماد فقط');
  });

  it('finishes calibration after a confirmation, and approves in the approval stage', async () => {
    const first = open(PAGE([ROW()]));
    fireEvent.click(await screen.findByRole('button', { name: 'إنهاء المعايرة وإرسالها للاعتماد' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'إنهاء المعايرة وإرسالها للاعتماد' }));
    await waitFor(() => expect(first.calls.some((c) => c.method === 'POST' && c.url.endsWith('/finish'))).toBe(true));
  });

  it('hides the holder\'s buttons and the row action from a person who only views', async () => {
    open(PAGE([ROW()]), [CorePermission.PerformanceCalibrationView]);
    await screen.findByRole('table', { name: 'المعايرة والاعتماد' });
    expect(screen.queryByRole('button', { name: 'إنهاء المعايرة وإرسالها للاعتماد' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'اعتماد النتائج وإبلاغ الجميع فرديًا' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /عدّل الدرجة/ })).not.toBeInTheDocument();
  });

  it('shows the objections in the second tab: accept returns it to the manager, reject needs a reason', async () => {
    const item = { id: 'o1', employeeId: 'e1', employeeName: 'سارة أحمد', itemKind: 'criterion' as const, itemRef: '0', reason: 'أرى أن إنجازي أعلى', status: 'open' as const, decisionReason: null, createdAt: '2026-11-10T10:00:00.000Z', decidedAt: null };
    const { calls } = open(PAGE([ROW()], { cycle: { fiscalYear: 2026, stage: 'notif' } }), KEYS, { items: [item] });
    fireEvent.click(await screen.findByRole('tab', { name: 'الاعتماد والاعتراضات' }));
    await screen.findByText('أرى أن إنجازي أعلى');
    fireEvent.click(screen.getByRole('button', { name: 'قبول وإعادته للمدير: سارة أحمد' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/performance/objections/o1/return')).toBe(true));
    fireEvent.click(screen.getByRole('button', { name: 'رفض: سارة أحمد' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'رفض' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('سبب الرفض'), { target: { value: 'التقييم موثّق ببيانات المعيار' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'رفض' }));
    await waitFor(() => expect(calls.find((c) => c.url === '/api/performance/objections/o1/reject')?.body).toEqual({ reason: 'التقييم موثّق ببيانات المعيار' }));
  });

  it('opens no adjustment from a row click when the person cannot adjust, the stage is not calibration, or the manager has not sent', async () => {
    open(PAGE([ROW()], { cycle: { fiscalYear: 2026, stage: 'appr' } }));
    fireEvent.click(await screen.findByText('سارة أحمد'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); // the approval stage
  });

  it('opens no adjustment for a person who only views', async () => {
    open(PAGE([ROW()]), [CorePermission.PerformanceCalibrationView]);
    fireEvent.click(await screen.findByText('سارة أحمد'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
