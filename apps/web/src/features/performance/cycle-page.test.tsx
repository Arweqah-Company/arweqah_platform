import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorePermission, type CycleStage, type CycleStateDto } from '@arweqah-platform/shared';
import { toast } from 'sonner';
import { CATALOG, CYCLE_KEYS, NOT_READY, TEMPLATES, cycleState } from '../../../test/performance-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { CyclePage } from './cycle-page';


type Call = { method: string; url: string; body: unknown };

function open(state: CycleStateDto = cycleState(null), keys: string[] = CYCLE_KEYS) {
  window.localStorage.setItem('view:performance-catalog', 'table');
  const calls: Call[] = [];
  const record = async (request: Request) => { calls.push({ method: request.method, url: new URL(request.url).pathname, body: request.method === 'DELETE' ? null : await request.json() }); };
  const after = (stage: CycleStage) => cycleState(stage);
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/performance/cycle', () => HttpResponse.json(state)),
    http.get('*/api/performance/templates', () => HttpResponse.json(TEMPLATES)),
    http.post('*/api/performance/cycle/open', async ({ request }) => { await record(request); return HttpResponse.json(after('self')); }),
    http.post('*/api/performance/cycle/advance', async ({ request }) => { await record(request); return HttpResponse.json(after('mgr')); }),
    http.post('*/api/performance/cycle/close', async ({ request }) => { await record(request); return HttpResponse.json(after('closed')); }),
    http.put('*/api/performance/cycle/dates/:key', async ({ request }) => { await record(request); return HttpResponse.json(state); }),
    http.post('*/api/performance/cycle/catalog', async ({ request }) => { await record(request); return HttpResponse.json(CATALOG[0], { status: 201 }); }),
    http.delete('*/api/performance/cycle/catalog/:id', async ({ request }) => { await record(request); return new HttpResponse(null, { status: 204 }); }),
  );
  renderPage(<CyclePage />);
  return { calls };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(toast, 'info').mockReturnValue(1);
  vi.spyOn(toast, 'success').mockReturnValue(1);
});

describe('The header and the stepper of the evaluation cycle page (FR-118)', () => {
  it('says what the page is, with «close» first and «open» after it, and no demo wording', async () => {
    open();
    expect(await screen.findByRole('heading', { level: 1, name: 'دورة التقييم' })).toBeInTheDocument();
    expect(screen.getByText('السنة المالية من أبريل إلى مارس. تفتحها الموارد البشرية، وتنتقل مراحلها بتواريخها.')).toBeInTheDocument();
    const buttons = await screen.findAllByRole('button', { name: /إغلاق الدورة|فتح دورة التقييم وإبلاغ الموظفين/ });
    expect(buttons.map((b) => b.textContent)).toEqual(['إغلاق الدورة', 'فتح دورة التقييم وإبلاغ الموظفين']);
    expect(screen.queryByText(/للتجربة/)).not.toBeInTheDocument();
  });

});

describe('The stepper of the evaluation cycle page (FR-118)', () => {
  it('draws the seven stages one after another, none marked before a cycle opens, and marks the one the cycle is in', async () => {
    open();
    const list = await screen.findByRole('list', { name: 'مراحل دورة التقييم' });
    expect(within(list).getAllByRole('button').map((b) => b.textContent)).toEqual(['التقييم الذاتي', 'تقييم المدير', 'المعايرة', 'الاعتماد', 'الإبلاغ الفردي', 'نافذة الاعتراض', 'مغلقة']);
    expect(within(list).queryByText('لم تُفتح')).not.toBeInTheDocument();
    expect(within(list).queryByRole('button', { current: 'step' })).not.toBeInTheDocument();
  });

  it('marks the current stage', async () => {
    open(cycleState('cal'));
    expect(await screen.findByRole('button', { name: 'المعايرة', current: 'step' })).toBeInTheDocument();
  });

  it('keeps «close» in place but dimmed before a cycle opens, and says why when it is pressed (not silent)', async () => {
    const { calls } = open();
    const close = await screen.findByRole('button', { name: 'إغلاق الدورة' });
    expect(close).toHaveAttribute('aria-disabled', 'true');
    expect(close).not.toBeDisabled();
    fireEvent.click(close);
    expect(toast.info).toHaveBeenCalledWith('لم تُفتح الدورة بعد.');
    expect(calls).toHaveLength(0);
  });

  it('says the cycle is closed when «close» is pressed after it closed, and offers to open the next one', async () => {
    open(cycleState('closed'));
    fireEvent.click(await screen.findByRole('button', { name: 'إغلاق الدورة' }));
    expect(toast.info).toHaveBeenCalledWith('الدورة مغلقة.');
    expect(screen.getByRole('button', { name: 'فتح دورة التقييم وإبلاغ الموظفين' })).toBeInTheDocument();
  });

  it('keeps «open» dimmed and says why while the evaluation file is incomplete, and opens nothing', async () => {
    const { calls } = open(cycleState(null, { readiness: NOT_READY }));
    const button = await screen.findByRole('button', { name: 'فتح دورة التقييم وإبلاغ الموظفين' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(button);
    expect(toast.info).toHaveBeenCalledWith(expect.stringContaining('لا يمكن فتح الدورة قبل رفع ملف التقييم'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('opens the cycle of the fiscal year the server proposes, after checking the year', async () => {
    const { calls } = open(cycleState(null, { nextFiscalYear: 2026 }));
    fireEvent.click(await screen.findByRole('button', { name: 'فتح دورة التقييم وإبلاغ الموظفين' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('السنة المالية')).toHaveValue('2026');
    fireEvent.change(within(dialog).getByLabelText('السنة المالية'), { target: { value: '20' } });
    expect(within(dialog).getByText('أدخل سنة من أربعة أرقام.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'فتح الدورة' })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('السنة المالية'), { target: { value: '2027' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'فتح الدورة' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: '/api/performance/cycle/open', body: { fiscalYear: 2027 } }));
  });

  it('moves the cycle on after a confirmation', async () => {
    const { calls } = open(cycleState('self'));
    fireEvent.click(await screen.findByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/performance/cycle/advance')).toBe(true));
  });

  it('in the objection stage «move on» is the closing: it asks «confirm» with the concept\'s words and closes only after it', async () => {
    const { calls } = open(cycleState('obj'));
    fireEvent.click(await screen.findByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'تأكيد' })).toBeInTheDocument();
    expect(within(dialog).getByText('إغلاق الدورة نهائيًا؟ لا تعديل بعدها على التقييمات، وتبقى النتائج في سجل كل موظف.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole('button', { name: 'تأكيد' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/performance/cycle/close')).toBe(true));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('أُغلقت الدورة وحُفظ اسمك ووقت الإغلاق.'));
  });

  it('closes from the header button after the confirmation, and can cancel it', async () => {
    const { calls } = open(cycleState('mgr'));
    fireEvent.click(await screen.findByRole('button', { name: 'إغلاق الدورة' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(calls).toHaveLength(0);
  });
});

describe('The stage window (FR-118, plan §3.7b)', () => {
  it('says who works in the stage, what happens and when, in the concept\'s words, and whether it is past, current or coming', async () => {
    open(cycleState('cal'));
    fireEvent.click(await screen.findByRole('button', { name: 'تقييم المدير' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'تقييم المدير' })).toBeInTheDocument();
    expect(within(dialog).getByText('مرحلة انتهت')).toBeInTheDocument();
    expect(within(dialog).getByText('المدير المباشر ثم المدير الأعلى')).toBeInTheDocument();
    expect(within(dialog).getByText('يراجع التقييم الذاتي ويدخل درجات النتائج والسلوك؛ تقييم غير المباشرين يتبع مراجعة مديرهم المباشر.')).toBeInTheDocument();
    expect(within(dialog).getByText('بعد التقييم الذاتي')).toBeInTheDocument();
    expect(within(dialog).getByText('من يعمل فيها')).toBeInTheDocument();
    expect(within(dialog).getByText('ماذا يحدث')).toBeInTheDocument();
    expect(within(dialog).getByText('الموعد')).toBeInTheDocument();
  });

  it('says «the current stage» and «a coming stage» for the others', async () => {
    open(cycleState('cal'));
    fireEvent.click(await screen.findByRole('button', { name: 'المعايرة' }));
    expect(within(await screen.findByRole('dialog')).getByText('المرحلة الحالية')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: 'إغلاق' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(await screen.findByRole('button', { name: 'نافذة الاعتراض' }));
    expect(within(await screen.findByRole('dialog')).getByText('مرحلة قادمة')).toBeInTheDocument();
  });

  it('«go to the screen of this stage» closes the window for the stages followed from this page', async () => {
    open(cycleState('self'));
    fireEvent.click(await screen.findByRole('button', { name: 'التقييم الذاتي' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'اذهب إلى شاشة هذه المرحلة' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps that button dimmed for a stage whose screen is not built yet, and says why instead of going silent', async () => {
    open(cycleState('self'));
    fireEvent.click(await screen.findByRole('button', { name: 'المعايرة' }));
    const dialog = await screen.findByRole('dialog');
    const go = within(dialog).getByRole('button', { name: 'اذهب إلى شاشة هذه المرحلة' });
    expect(go).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(go);
    expect(toast.info).toHaveBeenCalledWith('شاشة هذه المرحلة تُبنى في دفعة لاحقة.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('The dates of the stages (FR-118, plan §3.7b)', () => {
  it('writes each date as a range or a single day, with the stage it belongs to, all seven always', async () => {
    open();
    const table = await screen.findByRole('table', { name: 'مواعيد المراحل' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(7);
    expect(within(rows[0]!).getByText('15 أبريل 2027 إلى 20 أبريل 2027')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('الختامي النهائي بعد إقفال الأرقام')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('27 أبريل 2027')).toBeInTheDocument();
    expect(within(rows[5]!).getByText('10 مارس 2027')).toBeInTheDocument();
  });

  it('lets a date be changed before any cycle is open, and says what the dialog asks in the concept\'s words', async () => {
    const { calls } = open(cycleState(null, { datesFor: 'next' }));
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل موعد الاعتماد' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'تعديل موعد' })).toBeInTheDocument();
    expect(within(dialog).getByText('الاعتماد')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('من (أو يوم واحد) *')).toHaveValue('2027-04-27');
    expect(within(dialog).getByLabelText('إلى (اختياري)')).toHaveValue('');
    expect(within(dialog).getByText('يُسجَّل التعديل في التدقيق ويصل إشعار لمن تتأثر مواعيدهم.')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('من (أو يوم واحد) *'), { target: { value: '2027-04-28' } });
    expect(within(dialog).queryByRole('alert')?.textContent ?? '').toBe('');
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ الموعد' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: '/api/performance/cycle/dates/approval', body: { from: '2027-04-28', to: null } }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('حُفظ الموعد.'));
  });

  it('says as it is typed that a date starts before the stage ahead of it ends, and names that day; nothing is sent', async () => {
    const { calls } = open(cycleState('self'));
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل موعد لقاءا المعايرة' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('من (أو يوم واحد) *'), { target: { value: '2027-04-10' } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('الموعد يسبق نهاية المرحلة قبله (20 أبريل 2027).');
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ الموعد' }));
    expect(calls).toHaveLength(0);
  });

  it('says it when the date runs past the day the next stage starts, and when the end is before the start', async () => {
    open(cycleState('self'));
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل موعد لقاءا المعايرة' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('إلى (اختياري)'), { target: { value: '2027-04-28' } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('الموعد يتجاوز بداية المرحلة بعده (27 أبريل 2027).');
    fireEvent.change(within(dialog).getByLabelText('إلى (اختياري)'), { target: { value: '2027-04-20' } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('تاريخ النهاية قبل البداية.');
  });

  it('says the date is required when it is emptied, and presses on saving without silence', async () => {
    const { calls } = open(cycleState('self'));
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل موعد الاعتماد' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('من (أو يوم واحد) *'), { target: { value: '' } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('التاريخ مطلوب.');
    const save = within(dialog).getByRole('button', { name: 'حفظ الموعد' });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(calls).toHaveLength(0);
  });

  it('does not crash on a refusal from the server it has no words for, nor on a problems value that is not a list', async () => {
    open(cycleState('self'));
    server.use(http.put('*/api/performance/cycle/dates/:key', () => HttpResponse.json({ code: 'CYCLE_DATE_INVALID', message: 'x', details: { problems: 'oops' } }, { status: 422 })));
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل موعد الاعتماد' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('من (أو يوم واحد) *'), { target: { value: '2027-04-28' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ الموعد' }));
    expect(await within(dialog).findByText('تعذّر حفظ الموعد.')).toBeInTheDocument();
  });

  it('offers no pencil without the manage key', async () => {
    open(cycleState('self'), [CorePermission.PerformanceCycleView]);
    await screen.findByRole('table', { name: 'مواعيد المراحل' });
    expect(screen.queryByRole('button', { name: /تعديل موعد/ })).not.toBeInTheDocument();
  });
});

describe('The readiness list (FR-118)', () => {
  it('lists each stage with its name and whether it is uploaded, the scale, the card and the catalog, and the note about the snapshot', async () => {
    open(cycleState(null, { readiness: NOT_READY }));
    const card = (await screen.findByRole('heading', { name: 'جاهزية فتح الدورة' })).closest('section')!;
    expect(within(card).getByText(/تقييم المرحلة 1 التأسيس/)).toBeInTheDocument();
    expect(within(card).getByText(/تقييم المرحلة 5 القيادة المؤسسية/)).toBeInTheDocument();
    expect(within(card).getAllByText('مرفوع').length).toBe(4); // two stages, the scale and the card
    expect(within(card).getAllByText('لم يُرفع')).toHaveLength(3);
    expect(within(card).getByText(/كتالوج المكوّن الإضافي/)).toBeInTheDocument();
    expect(within(card).getByText('2 بنود')).toBeInTheDocument();
    expect(within(card).getByText('تأخذ الدورة لقطة من قالب كل مرحلة وقت الفتح، فلا يتغير تقييم سنة مضت إن تغيّر الملف لاحقًا.')).toBeInTheDocument();
  });

  it('has no upload button of its own: the evaluation file is the list under it, with the upload in its toolbar', async () => {
    open();
    const card = (await screen.findByRole('heading', { name: 'جاهزية فتح الدورة' })).closest('section')!;
    expect(within(card).queryByRole('button', { name: 'رفع ملف التقييم' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'رفع ملف التقييم' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

describe('The catalog of the extra component (FR-118)', () => {
  it('has the concept\'s title, the caps note under it and «add an item» beside it', async () => {
    open(cycleState('self', { catalogCaps: { init: 10, growth: 5 } }));
    expect((await screen.findAllByText('كتالوج المكوّن الإضافي لهذه السنة')).length).toBeGreaterThan(0);
    expect(screen.getByText('سقف مبادرات داخلية 10، ومساهمة في النمو 5. التعلم آلي من خطة التعلم.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'إضافة بند' })).toBeInTheDocument();
  });

  it('adds an item through the concept\'s dialog: two points to start with, one sentence while a value is wrong, then the toast', async () => {
    const { calls } = open(cycleState('self'));
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة بند' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'إضافة بند للكتالوج' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('النقاط *')).toHaveValue(2);
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('اكتب اسم البند (3 أحرف) ونقاطًا من 1 إلى 10.');
    expect(calls).toHaveLength(0);
    fireEvent.change(within(dialog).getByLabelText('البند *'), { target: { value: 'مبادرة جديدة' } });
    fireEvent.change(within(dialog).getByLabelText('النقاط *'), { target: { value: '11' } });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('اكتب اسم البند');
    fireEvent.change(within(dialog).getByLabelText('النقاط *'), { target: { value: '5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', url: '/api/performance/cycle/catalog', body: { kind: 'init', title: 'مبادرة جديدة', points: 5 } }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('أُضيف البند للكتالوج.'));
  });

  it('keeps search and filter, and deletes an item only after a confirmation', async () => {
    const { calls } = open(cycleState('self'));
    expect(await screen.findByText('قيادة مبادرة تحسين')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('ابحث في البنود'), { target: { value: 'ورشة' } });
    await waitFor(() => expect(screen.queryByText('قيادة مبادرة تحسين')).not.toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('ابحث في البنود'), { target: { value: '' } });
    fireEvent.click(await screen.findByRole('button', { name: /حذف البند: مساهمة في ورشة/ }));
    expect(calls).toHaveLength(0);
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حذف البند' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', url: '/api/performance/cycle/catalog/i2', body: null }));
  });

  it('tells the person when deleting an item fails', async () => {
    open(cycleState('self'));
    server.use(http.delete('*/api/performance/cycle/catalog/:id', () => HttpResponse.json({ code: 'x', message: 'x' }, { status: 500 })));
    fireEvent.click(await screen.findByRole('button', { name: /حذف البند: مساهمة في ورشة/ }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'حذف البند' }));
    expect(await screen.findByText('تعذّر حذف البند.')).toBeInTheDocument();
  });
});

describe('Keys and failures (FR-118)', () => {
  it('shows no action without its key: only the view key sees the cards and no button but the stages', async () => {
    open(cycleState('self'), [CorePermission.PerformanceCycleView]);
    await screen.findByText('دورة السنة المالية 2026');
    for (const name of ['نقل الدورة للمرحلة التالية', 'إغلاق الدورة', 'رفع ملف التقييم', 'إضافة بند', 'إضافة تذكير']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تصدير/ })).not.toBeInTheDocument();
  });

  it('tells the person when moving the cycle on is refused, and keeps the dialog open', async () => {
    open(cycleState('self'));
    server.use(http.post('*/api/performance/cycle/advance', () => HttpResponse.json({ code: 'CYCLE_STAGE_CHANGED', message: 'x' }, { status: 409 })));
    fireEvent.click(await screen.findByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'نقل الدورة للمرحلة التالية' }));
    expect(await screen.findByText('تعذّر تنفيذ العملية: ربما تغيّرت مرحلة الدورة. أعد تحميل الصفحة.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('says the page could not load when the server fails', async () => {
    open(cycleState(null));
    server.use(http.get('*/api/performance/cycle', () => HttpResponse.json({ code: 'x', message: 'x' }, { status: 500 })));
    renderPage(<CyclePage />);
    expect((await screen.findAllByText('تعذّر تحميل دورة التقييم.')).length).toBeGreaterThan(0);
  });
});
