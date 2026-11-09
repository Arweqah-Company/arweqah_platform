import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorePermission, type TemplatesDto } from '@arweqah-platform/shared';
import { toast } from 'sonner';
import { CYCLE_KEYS, FISCAL, SCALE, TEMPLATES, stageTemplate } from '../../../test/performance-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { chooseOption } from '../../../test/select';
import { TemplatesList } from './templates-list';

type Call = { method: string; url: string; body: unknown };

function open(keys: string[] = CYCLE_KEYS, templates: TemplatesDto = TEMPLATES) {
  window.localStorage.setItem('view:performance-templates', 'table');
  const calls: Call[] = [];
  const record = async (request: Request) => { calls.push({ method: request.method, url: new URL(request.url).pathname, body: request.method === 'DELETE' ? null : await request.json() }); return HttpResponse.json(templates); };
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.put('*/api/performance/templates/*', ({ request }) => record(request)),
    http.delete('*/api/performance/templates/stages/:stage', async ({ request }) => { calls.push({ method: 'DELETE', url: new URL(request.url).pathname, body: null }); return new HttpResponse(null, { status: 204 }); }),
  );
  const onUpload = vi.fn();
  renderPage(<TemplatesList templates={templates} onUpload={onUpload} />);
  return { calls, onUpload };
}

const rowOf = async (name: RegExp) => { const table = await screen.findByRole('table', { name: 'ملف التقييم' }); return within(table).getAllByRole('row').find((r) => name.test(r.textContent ?? ''))!; };

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(toast, 'success').mockReturnValue(1);
});

describe('The evaluation file list (FR-118, plan §3.7ج)', () => {
  it('always has seven rows: the five stages kept or not, the scale and the card, with what each holds', async () => {
    open();
    const table = await screen.findByRole('table', { name: 'ملف التقييم' });
    expect(within(table).getAllByRole('row')).toHaveLength(8);
    const first = await rowOf(/المرحلة 1 التأسيس/);
    expect(within(first).getByText('60/40 · 4 معايير · 4 سلوكيات · 125%')).toBeInTheDocument();
    expect(within(first).getByText('مرفوع')).toBeInTheDocument();
    expect(within(await rowOf(/المرحلة 3 البراعة/)).getByText('لم يُرفع')).toBeInTheDocument();
    expect(within(await rowOf(/سلم الدرجات/)).getByText('5 مستويات')).toBeInTheDocument();
    expect(within(await rowOf(/بطاقة السنة المالية/)).getByText('12 شهرًا و1 ملاحظات')).toBeInTheDocument();
  });

  it('searches the parts and filters by the state, and has the upload in its toolbar', async () => {
    const { onUpload } = open();
    await screen.findByRole('table', { name: 'ملف التقييم' });
    fireEvent.change(screen.getByPlaceholderText('ابحث في الأجزاء'), { target: { value: 'سلم' } });
    await waitFor(() => expect(screen.queryByText(/المرحلة 1 التأسيس/)).not.toBeInTheDocument());
    expect(screen.getByText('سلم الدرجات', { selector: 'span' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'رفع ملف التقييم' }));
    expect(onUpload).toHaveBeenCalledOnce();
  });

  it('adds a stage that is not uploaded: a blank template with the stage\'s name, the basic total and the cap computed as it is filled, and the checks said as it is typed', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة: المرحلة 3 البراعة' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('اسم المرحلة')).toHaveValue('البراعة');
    fireEvent.change(within(dialog).getByLabelText('وزن النتائج'), { target: { value: '50' } });
    fireEvent.change(within(dialog).getByLabelText('وزن السلوك'), { target: { value: '50' } });
    expect(within(dialog).getByText('الأساسي = وزن النتائج + وزن السلوك = 100')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة مكوّن' }));
    fireEvent.change(within(dialog).getByLabelText('المكوّن'), { target: { value: 'تعلم' } });
    fireEvent.change(within(dialog).getByLabelText('النقاط'), { target: { value: '10' } });
    expect(within(dialog).getByText('السقف = الأساسي + نقاط المكوّن الإضافي = 110')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة معيار' }));
    fireEvent.change(within(dialog).getByLabelText('المعيار'), { target: { value: 'جودة التسليم' } });
    fireEvent.change(within(dialog).getByLabelText('الحصة %'), { target: { value: '60' } });
    expect(within(dialog).getByText('مجموع الحصص: 60 من 100')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة سلوك' }));
    expect(within(dialog).getByLabelText('الرمز')).toHaveValue('B3.1');
    fireEvent.change(within(dialog).getByLabelText('السلوك'), { target: { value: 'التعاون' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(within(dialog).getByText('حصص معايير النتائج لا تجمع 100.')).toBeInTheDocument();
    expect(within(dialog).getByText('سلوك بلا سؤال للمقيّم.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    fireEvent.change(within(dialog).getByLabelText('الحصة %'), { target: { value: '100' } });
    fireEvent.change(within(dialog).getByLabelText('سؤال المقيّم'), { target: { value: 'هل يتعاون؟' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'PUT', url: '/api/performance/templates/stages/3', body: { name: 'البراعة', resultsWeight: 50, behaviourWeight: 50, extra: [{ name: 'تعلم', points: 10 }], ruleText: '', resultsNote: '', criteria: [{ name: 'جودة التسليم', share: 100 }], behaviours: [{ code: 'B3.1', name: 'التعاون', question: 'هل يتعاون؟' }] } }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('حُفظ قالب المرحلة.'));
  });

  it('changes a stage kept: it opens with what the stage holds, and a behaviour without its question or with a repeated code is refused in words', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل: المرحلة 1 التأسيس' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('وزن النتائج')).toHaveValue(60);
    expect(within(dialog).getByText('مجموع الحصص: 100 من 100')).toBeInTheDocument();
    const questions = within(dialog).getAllByLabelText('سؤال المقيّم');
    fireEvent.change(questions[0]!, { target: { value: '' } });
    expect(within(dialog).getByText('سلوك بلا سؤال للمقيّم.')).toBeInTheDocument();
    fireEvent.change(questions[0]!, { target: { value: 'سؤال جديد' } });
    const codes = within(dialog).getAllByLabelText('الرمز');
    fireEvent.change(codes[1]!, { target: { value: 'B1.1' } });
    expect(within(dialog).getByText('رمز سلوك غير صحيح أو مكرر (الصيغة B1.1).')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(calls).toHaveLength(0);
    fireEvent.change(codes[1]!, { target: { value: 'B1.2' } });
    expect(within(dialog).queryByText('رمز سلوك غير صحيح أو مكرر (الصيغة B1.1).')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'حذف' }).at(-1)!); // the last behaviour
    expect(within(dialog).queryByDisplayValue('سؤال 4')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/performance/templates/stages/1')).toBe(true));
    expect((calls[0]!.body as { behaviours: unknown[] }).behaviours).toHaveLength(3);
  });

});

describe('Deleting stages and changing the scale and the card (FR-118)', () => {
  it('deletes a kept stage only after a confirmation, and offers no delete for the scale or the card', async () => {
    const { calls } = open();
    expect(screen.queryByRole('button', { name: /حذف المرحلة: سلم الدرجات/ })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'حذف المرحلة: المرحلة 2 التخصص' }));
    expect(calls).toHaveLength(0);
    expect(within(await screen.findByRole('dialog')).getByText(/سيصير «المرحلة 2 التخصص» غير مرفوع/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'حذف المرحلة' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', url: '/api/performance/templates/stages/2', body: null }));
  });

  it('changes the grade scale: five levels, the ranges checked as they are typed, and the text of the ranges shown once they are right', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل: سلم الدرجات' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('110 فأكثر · 95 إلى 109.9 · 80 إلى 94.9 · 65 إلى 79.9 · أقل من 65')).toBeInTheDocument();
    const toFields = within(dialog).getAllByLabelText('إلى');
    fireEvent.change(toFields[0]!, { target: { value: '120' } }); // the second level now ends above where the first starts
    expect(within(dialog).getByText('النطاقات يجب أن تتتالى من الأعلى إلى الأدنى بلا تداخل.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(calls).toHaveLength(0);
    fireEvent.change(toFields[0]!, { target: { value: '109' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/performance/templates/scale')).toBe(true));
    expect((calls.find((c) => c.url.endsWith('/scale'))!.body as { bands: unknown[] }).bands).toHaveLength(5);
    expect(SCALE).toHaveLength(5);
  });

  it('starts a scale that is not kept with the five usual levels, and lets levels be added (at the bottom) and deleted', async () => {
    const { calls } = open(CYCLE_KEYS, { ...TEMPLATES, scale: null });
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة: سلم الدرجات' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByLabelText(/اسم المستوى/)).toHaveLength(5);
    expect(within(dialog).getByText('110 فأكثر · 95 إلى 109.9 · 80 إلى 94.9 · 65 إلى 79.9 · أقل من 65')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة مستوى' }));
    expect(within(dialog).getAllByLabelText(/اسم المستوى/)).toHaveLength(6);
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'حذف' }).at(-1)!);
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'حذف' })[1]!); // «exceeds»: the ranges now leave a gap but do not overlap
    expect(within(dialog).getAllByLabelText(/اسم المستوى/)).toHaveLength(4);
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith('/scale'))).toBe(true));
    expect((calls.find((c) => c.url.endsWith('/scale'))!.body as { bands: unknown[] }).bands).toHaveLength(4);
  });

  it('changes the fiscal card: the twelve months with their kind, and notes added or removed', async () => {
    const { calls } = open();
    fireEvent.click(await screen.findByRole('button', { name: 'تعديل: بطاقة السنة المالية' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('أبريل')).toHaveTextContent('محطة');
    await chooseOption(within(dialog).getByLabelText('مايو'), 'محطة');
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة ملاحظة' }));
    const texts = within(dialog).getAllByLabelText('نص الملاحظة');
    fireEvent.change(texts[1]!, { target: { value: 'ملاحظة جديدة' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls.some((c) => c.url === '/api/performance/templates/fiscal-card')).toBe(true));
    const sent = calls.find((c) => c.url.endsWith('/fiscal-card'))!.body as { months: { month: string; kind: string }[]; notes: { text: string }[] };
    expect(sent.months).toHaveLength(12);
    expect(sent.months[1]).toEqual({ month: 'مايو', kind: 'محطة' });
    expect(sent.notes.map((n) => n.text)).toEqual([FISCAL.notes[0]!.text, 'ملاحظة جديدة']);
  });

  it('opens a part when its row is clicked, and shows the list with nothing to change to someone without the edit key', async () => {
    open();
    await screen.findByRole('button', { name: 'تعديل: المرحلة 2 التخصص' }); // the keys have arrived
    fireEvent.click(screen.getByText(/المرحلة 2 التخصص/));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('has no add, change or delete without the edit key, and the stage template of the fixture is sound', async () => {
    open([CorePermission.PerformanceCycleView]);
    await screen.findByRole('table', { name: 'ملف التقييم' });
    for (const name of [/تعديل:/, /إضافة:/, /حذف المرحلة/, 'رفع ملف التقييم']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/المرحلة 2 التخصص/));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stageTemplate(1).cap).toBe(125);
  });
});
