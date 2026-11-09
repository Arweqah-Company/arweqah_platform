import { delay, http, HttpResponse } from 'msw';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CorePermission, type CycleStateDto, type EvalFileResult } from '@arweqah-platform/shared';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { CyclePage } from './cycle-page';

const ALL = [CorePermission.PerformanceCycleView, CorePermission.PerformanceCycleManage, CorePermission.PerformanceCycleClose, CorePermission.PerformanceTemplateUpload, CorePermission.PerformanceCatalogManage, CorePermission.PerformanceCatalogExport];
const READY = { stages: [1, 2, 3, 4, 5].map((stage) => ({ stage, ready: true })), scale: true, fiscal: true, catalogItems: 1, ready: true };
const NOT_READY = { ...READY, stages: READY.stages.map((s) => ({ ...s, ready: s.stage < 3 })), ready: false };
const CATALOG = [{ id: 'i1', kind: 'init' as const, title: 'قيادة مبادرة تحسين', points: 4 }, { id: 'i2', kind: 'growth' as const, title: 'مساهمة في ورشة', points: 2 }];
const cycle = (stage: CycleStateDto['cycle'] extends infer C ? (C extends { stage: infer S } ? S : never) : never, dates: CycleStateDto['cycle'] extends infer C ? (C extends { dates: infer D } ? D : never) : never = []): CycleStateDto => ({ cycle: { id: 'c1', fiscalYear: 2026, stage, openedAt: '2026-11-09T10:00:00.000Z', closedAt: null, dates }, readiness: READY, catalog: CATALOG });
const NONE: CycleStateDto = { cycle: null, readiness: READY, catalog: [] };

function open(state: CycleStateDto = NONE, keys: string[] = ALL) {
  window.localStorage.setItem('view:performance-catalog', 'table');
  const calls: { method: string; url: string; body: unknown }[] = [];
  const record = async (request: Request) => { calls.push({ method: request.method, url: new URL(request.url).pathname, body: request.method === 'DELETE' ? null : await request.json() }); };
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/performance/cycle', () => HttpResponse.json(state)),
    http.post('*/api/performance/cycle/open', async ({ request }) => { await record(request); return HttpResponse.json(cycle('self')); }),
    http.post('*/api/performance/cycle/advance', async ({ request }) => { await record(request); return HttpResponse.json(cycle('mgr')); }),
    http.post('*/api/performance/cycle/close', async ({ request }) => { await record(request); return HttpResponse.json({ ...cycle('closed') }); }),
    http.put('*/api/performance/cycle/dates/:key', async ({ request }) => { await record(request); return HttpResponse.json(cycle('self')); }),
    http.post('*/api/performance/cycle/catalog', async ({ request }) => { await record(request); return HttpResponse.json(CATALOG[0], { status: 201 }); }),
    http.delete('*/api/performance/cycle/catalog/:id', async ({ request }) => { await record(request); return new HttpResponse(null, { status: 204 }); }),
  );
  renderPage(<CyclePage />);
  return { calls };
}

describe('The evaluation cycle page (FR-118)', () => {
  it('shows the stepper with the current stage marked, and a stage opens to say who works in it and when', async () => {
    open(cycle('cal'));
    const current = await screen.findByRole('button', { name: /المعايرة/, current: 'step' });
    expect(current).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /التقييم الذاتي/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('الموظف')).toBeInTheDocument();
    expect(within(dialog).getAllByText('انتهت').length).toBeGreaterThan(0);
  });

  it('keeps «open» disabled and says why while the evaluation file is incomplete, and lists what is missing', async () => {
    open({ cycle: null, readiness: NOT_READY, catalog: [] });
    expect(await screen.findByText(/لا يمكن فتح الدورة قبل رفع ملف التقييم/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'فتح دورة التقييم' })).toBeDisabled();
    expect(screen.getByText('غير جاهزة')).toBeInTheDocument();
    expect(screen.getAllByText('لم يُرفع').length).toBeGreaterThanOrEqual(3);
  });

  it('opens the cycle of a fiscal year: the year is checked, then sent', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'فتح دورة التقييم' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('السنة المالية'), { target: { value: '20' } });
    expect(within(dialog).getByText('أدخل سنة من أربعة أرقام.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'فتح الدورة' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('السنة المالية'), { target: { value: '2027' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'فتح الدورة' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: '/api/performance/cycle/open', body: { fiscalYear: 2027 } }));
  });

  it('moves the cycle on after a confirmation, and offers no move at the last stage', async () => {
    const { calls } = open(cycle('self'));
    fireEvent.click(await screen.findByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/performance/cycle/advance')).toBe(true));
  });

  it('closes the cycle only after a confirmation', async () => {
    const { calls } = open(cycle('obj'));
    await screen.findByRole('button', { name: 'إغلاق الدورة' });
    expect(screen.queryByRole('button', { name: 'نقل الدورة للمرحلة التالية' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق الدورة' }));
    expect(calls).toHaveLength(0);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'إغلاق الدورة' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/performance/cycle/close')).toBe(true));
  });

  it('edits a date of the cycle in progress and shows why the server refused one that does not fit', async () => {
    const { calls } = open(cycle('self', [{ key: 'final', from: '2027-04-15', to: '2027-04-20' }]));
    fireEvent.click(await screen.findByRole('button', { name: /تعديل الموعد: لقاءا المعايرة/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('من'), { target: { value: '2027-04-21' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: '/api/performance/cycle/dates/calibration', body: { from: '2027-04-21', to: null } }));
  });

  it('shows the catalog with search and filter, adds an item after checking it, and deletes one after a confirmation', async () => {
    const { calls } = open(cycle('self'));
    expect(await screen.findByText('قيادة مبادرة تحسين')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('ابحث في البنود'), { target: { value: 'ورشة' } });
    await waitFor(() => expect(screen.queryByText('قيادة مبادرة تحسين')).not.toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('ابحث في البنود'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'إضافة بند' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة بند' }));
    expect(within(dialog).getByText(/اسم البند 3 أحرف على الأقل/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('البند'), { target: { value: 'مبادرة جديدة' } });
    fireEvent.change(within(dialog).getByLabelText('النقاط'), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة بند' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: '/api/performance/cycle/catalog', body: { kind: 'init', title: 'مبادرة جديدة', points: 5 } }));
    fireEvent.click(await screen.findByRole('button', { name: /حذف البند: مساهمة في ورشة/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حذف البند' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', url: '/api/performance/cycle/catalog/i2', body: null }));
  });

  it('shows no action without its key: only the view key sees the page and no button', async () => {
    open(cycle('self'), [CorePermission.PerformanceCycleView]);
    await screen.findByText('دورة السنة المالية 2026');
    for (const name of ['نقل الدورة للمرحلة التالية', 'إغلاق الدورة', 'رفع ملف التقييم', 'إضافة بند']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تصدير/ })).not.toBeInTheDocument();
  });
});

describe('Failures are shown, not swallowed (PR 67)', () => {
  it('tells the person when moving the cycle on is refused, and keeps the dialog open', async () => {
    open(cycle('self'));
    server.use(http.post('*/api/performance/cycle/advance', () => HttpResponse.json({ code: 'CYCLE_AT_LAST_STAGE', message: 'x' }, { status: 409 })));
    fireEvent.click(await screen.findByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    expect(await screen.findByText('تعذّر تنفيذ العملية: ربما تغيّرت مرحلة الدورة. أعد تحميل الصفحة.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('tells the person when deleting a catalog item fails', async () => {
    open(cycle('self'));
    server.use(http.delete('*/api/performance/cycle/catalog/:id', () => HttpResponse.json({ code: 'x', message: 'x' }, { status: 500 })));
    fireEvent.click(await screen.findByRole('button', { name: /حذف البند: مساهمة في ورشة/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حذف البند' }));
    expect(await screen.findByText('تعذّر حذف البند.')).toBeInTheDocument();
  });

  it('does not crash on a date problem the page has no words for, nor on a problems value that is not a list', async () => {
    open(cycle('self'));
    server.use(http.put('*/api/performance/cycle/dates/:key', () => HttpResponse.json({ code: 'CYCLE_DATE_INVALID', message: 'x', details: { problems: ['something_new'] } }, { status: 422 })));
    fireEvent.click(await screen.findByRole('button', { name: /تعديل الموعد: لقاءا المعايرة/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('من'), { target: { value: '2027-04-21' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(dialog).findByText('الموعد لا يناسب بقية المواعيد.')).toBeInTheDocument();
    server.use(http.put('*/api/performance/cycle/dates/:key', () => HttpResponse.json({ code: 'CYCLE_DATE_INVALID', message: 'x', details: { problems: 'oops' } }, { status: 422 })));
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(await within(dialog).findByText('تعذّر حفظ الموعد.')).toBeInTheDocument();
  });
});

describe('The evaluation file dialog (FR-118)', () => {
  const result = (problems: string[]): EvalFileResult => ({ stages: [{ stage: 1, name: 'التأسيس', problems: problems as never, template: {} as never }], scale: { bands: [{ name: 'a', range: '1', from: 1, to: null, description: '' }], problems: [] }, fiscal: null, ignored: [], saved: false });

  function openFile(problems: string[]) {
    const saved: unknown[] = [];
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me(ALL.map((key) => ({ key, scope: 'all' as const }))))),
      http.get('*/api/performance/cycle', () => HttpResponse.json(NONE)),
      http.post('*/api/performance/templates/file', async ({ request }) => {
        const body = (await request.json()) as { dryRun: boolean };
        if (!body.dryRun) saved.push(body);
        return HttpResponse.json(result(problems));
      }),
    );
    renderPage(<CyclePage />);
    return saved;
  }

  it('checks the pasted text on the server, names what fails and keeps «save» disabled while something fails', async () => {
    openFile(['cap_sum']);
    fireEvent.click(await screen.findByRole('button', { name: 'رفع ملف التقييم' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/الصق نص الملف/), { target: { value: 'نص' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'افحص الملف' }));
    expect(await within(dialog).findByText('الأساسي + الإضافي لا يساويان السقف.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'حفظ الملف' })).toBeDisabled();
  });

  it('saves a sound file', async () => {
    const saved = openFile([]);
    fireEvent.click(await screen.findByRole('button', { name: 'رفع ملف التقييم' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/الصق نص الملف/), { target: { value: 'نص' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'افحص الملف' }));
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'حفظ الملف' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ الملف' }));
    await waitFor(() => expect(saved).toEqual([{ text: 'نص', dryRun: false }]));
  });

  it('does not let text that changed while the check was still running be saved', async () => {
    const saved = openFile([]);
    server.use(http.post('*/api/performance/templates/file', async ({ request }) => {
      const body = (await request.json()) as { dryRun: boolean };
      if (!body.dryRun) saved.push(body);
      await delay(250);
      return HttpResponse.json(result([]));
    }));
    fireEvent.click(await screen.findByRole('button', { name: 'رفع ملف التقييم' }));
    const dialog = await screen.findByRole('dialog');
    const box = within(dialog).getByLabelText(/الصق نص الملف/);
    fireEvent.change(box, { target: { value: 'نص' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'افحص الملف' }));
    fireEvent.change(box, { target: { value: 'نص بعد التعديل' } }); // edited while the check runs
    await within(dialog).findByText('سليم', undefined, { timeout: 2000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 450));
    expect(within(dialog).getByRole('button', { name: 'حفظ الملف' })).toBeDisabled();
    expect(saved).toEqual([]);
  });
});
