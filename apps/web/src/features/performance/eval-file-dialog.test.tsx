import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EvalFileResult } from '@arweqah-platform/shared';
import { toast } from 'sonner';
import { CYCLE_KEYS, TEMPLATES, cycleState, evalResult, stageResult } from '../../../test/performance-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { CyclePage } from './cycle-page';


const ALL_STAGES = [1, 2, 3, 4, 5].map((n) => stageResult(n));

function openFile(result: EvalFileResult) {
  const saved: unknown[] = [];
  const checks: unknown[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(CYCLE_KEYS.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/performance/cycle', () => HttpResponse.json(cycleState(null))),
    http.get('*/api/performance/templates', () => HttpResponse.json(TEMPLATES)),
    http.post('*/api/performance/templates/file', async ({ request }) => {
      const body = (await request.json()) as { dryRun: boolean };
      (body.dryRun ? checks : saved).push(body);
      return HttpResponse.json(result);
    }),
  );
  renderPage(<CyclePage />);
  return { saved, checks };
}

async function extract(text = 'نص') {
  fireEvent.click(await screen.findByRole('button', { name: 'رفع ملف التقييم' }));
  const dialog = await screen.findByRole('dialog');
  if (text) fireEvent.change(within(dialog).getByLabelText('نص ملف التقييم'), { target: { value: text } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'استخراج' }));
  return dialog;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(toast, 'info').mockReturnValue(1);
  vi.spyOn(toast, 'success').mockReturnValue(1);
});

describe('The evaluation file dialog (FR-118, plan §3.7b)', () => {
  it('has the concept\'s title and words, and presses «extract» on an empty text with a message instead of going silent', async () => {
    const { checks } = openFile(evalResult(ALL_STAGES));
    const dialog = await extract('');
    expect(within(dialog).getByRole('heading', { name: 'رفع ملف تقييم الأداء (كل المراحل)' })).toBeInTheDocument();
    expect(within(dialog).getByText('ملف واحد فيه المراحل الخمس، ثم سلم الدرجات وبطاقة السنة المالية. لا يُحفظ شيء قبل مراجعتك.')).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText('الصق نص ملف التقييم')).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('الصق النص أولًا.');
    expect(checks).toHaveLength(0);
  });

  it('shows a table with a row per stage: the basic split, the criteria, the cap, the behaviours and «sound»', async () => {
    openFile(evalResult([stageResult(1), stageResult(2, [], { results: 50, behaviour: 50, criteria: 3, behaviours: 5, cap: 120 })], 5, 12));
    const dialog = await extract();
    const table = await within(dialog).findByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[0]!).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['المرحلة', 'الأساسي', 'حصص النتائج', 'الإضافي والسقف', 'السلوكيات', 'الحالة']);
    for (const text of ['1 التأسيس', '60/40', '4 معايير', '125%', '4 سلوكيات', 'سليمة']) expect(within(rows[1]!).getByText(text)).toBeInTheDocument();
    for (const text of ['2 التخصص', '50/50', '3 معايير', '120%', '5 سلوكيات']) expect(within(rows[2]!).getByText(text)).toBeInTheDocument();
  });

  it('says what the stages share (scale levels, months, notes) and warns that fewer than five stages were found', async () => {
    openFile(evalResult([stageResult(1)]));
    const dialog = await extract();
    expect(await within(dialog).findByText('مشترك بين المراحل: سلم الدرجات 5 مستويات، وبطاقة السنة المالية 12 شهرًا و2 ملاحظات.')).toBeInTheDocument();
    expect(within(dialog).getByText('وُجدت 1 مراحل فقط من 5. المراحل الناقصة تبقى «لم يُرفع».')).toBeInTheDocument();
    expect(within(dialog).getByText('لا يُحفظ تقييم أوزانه لا تُجمع كما هو متوقع.')).toBeInTheDocument();
  });

  it('marks a stage that failed a check «needs review», keeps «save» off and says why in a line beside it', async () => {
    openFile(evalResult([stageResult(1, ['cap_sum'])]));
    const dialog = await extract();
    expect(await within(dialog).findByText('تحتاج مراجعة')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'حفظ تقييم كل المراحل' })).toBeDisabled();
    expect(within(dialog).getByText('يُفعَّل الحفظ بعد استخراج ملف سليم بكل مراحله وسلمه وبطاقته.')).toBeInTheDocument();
  });

  it('keeps «save» off when the scale has a single level or the card fewer than twelve months, though every stage is sound', async () => {
    openFile(evalResult(ALL_STAGES, 1, 12));
    const dialog = await extract();
    expect(await within(dialog).findByText(/سلم الدرجات 1 مستويات/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'حفظ تقييم كل المراحل' })).toBeDisabled();
  });

  it('lists the checks of the stage that the columns do not show, such as a stage that appears twice', async () => {
    openFile(evalResult([stageResult(1, ['duplicate_stage'])]));
    const dialog = await extract();
    expect(await within(dialog).findByText('المرحلة مكررة في الملف.')).toBeInTheDocument();
  });

  it('saves a sound file and says how many stages were saved', async () => {
    const { saved } = openFile(evalResult(ALL_STAGES));
    const dialog = await extract();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'حفظ تقييم كل المراحل' })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ تقييم كل المراحل' }));
    await waitFor(() => expect(saved).toEqual([{ text: 'نص', dryRun: false }]));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('حُفظ تقييم 5 مراحل وظهر في ملفات شاغلي المسميات.'));
  });

  it('offers the AI after the ordinary reading, marks its answer, lists what is not in the file word for word, and saves what it found through «confirm»', async () => {
    const confirmed: unknown[] = [];
    const sound = evalResult(ALL_STAGES);
    server.use(
      http.get('*/api/me', () => HttpResponse.json(me(CYCLE_KEYS.map((key) => ({ key, scope: 'all' as const }))))),
      http.get('*/api/performance/cycle', () => HttpResponse.json(cycleState(null))),
      http.get('*/api/performance/templates', () => HttpResponse.json(TEMPLATES)),
      http.post('*/api/performance/templates/file', () => HttpResponse.json({ ...evalResult([stageResult(1, ['cap_sum'])]), aiAvailable: true })),
      http.post('*/api/performance/templates/file/ai', () => HttpResponse.json({ ...sound, source: 'ai', ungrounded: ['نص غير موجود'], content: { stages: [], scale: null, fiscal: null } })),
      http.post('*/api/performance/templates/file/confirm', async ({ request }) => { confirmed.push(await request.json()); return HttpResponse.json({ ...sound, saved: true }); }),
    );
    renderPage(<CyclePage />);
    const dialog = await extract();
    fireEvent.click(await within(dialog).findByRole('button', { name: 'حلّل بالذكاء الاصطناعي' }));
    expect(await within(dialog).findByText('رتّبه الذكاء الاصطناعي: راجعه قبل الحفظ')).toBeInTheDocument();
    expect(within(dialog).getByText('نص غير موجود')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ تقييم كل المراحل' }));
    await waitFor(() => expect(confirmed).toEqual([{ content: { stages: [], scale: null, fiscal: null } }]));
  });

  it('does not let text that changed while the check was still running be saved', async () => {
    const { saved } = openFile(evalResult(ALL_STAGES));
    server.use(http.post('*/api/performance/templates/file', async ({ request }) => {
      const body = (await request.json()) as { dryRun: boolean };
      if (!body.dryRun) saved.push(body);
      await delay(250);
      return HttpResponse.json(evalResult(ALL_STAGES));
    }));
    const dialog = await extract();
    fireEvent.change(within(dialog).getByLabelText('نص ملف التقييم'), { target: { value: 'نص بعد التعديل' } }); // edited while the check runs
    await new Promise((r) => setTimeout(r, 450));
    expect(within(dialog).getByRole('button', { name: 'حفظ تقييم كل المراحل' })).toBeDisabled();
    expect(saved).toEqual([]);
  });
});
