import { http, HttpResponse } from 'msw';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CorePermission, type MyEvaluationDto, type SaveSelfEvaluationInput, type SelfEvaluationDto, type StageTemplate } from '@arweqah-platform/shared';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { EvaluationSection } from './evaluation-section';

const TEMPLATE: StageTemplate = {
  stage: 2, name: 'التخصص', resultsWeight: 50, behaviourWeight: 50, basicTotal: 100, extra: [{ name: 'تعلم', points: 10 }, { name: 'مبادرات داخلية', points: 10 }, { name: 'مساهمة في النمو', points: 5 }], cap: 125,
  ruleText: 'يقيم المدير المباشر كل موظف وحده', resultsNote: 'مهام مقبولة في موعدها', criteria: [{ name: 'المهام المقبولة', share: 60 }, { name: 'صحة العمل', share: 40 }],
  behaviours: [{ code: 'B2.1', name: 'الانضباط', question: 'هل يلتزم بالمواعيد؟' }, { code: 'B2.2', name: 'مراجعة العمل', question: 'هل يراجع عمله؟' }],
};
const SCALE = [{ name: 'استثنائي', range: '110 فأكثر', from: 110, to: null, description: 'تجاوز المستهدفات' }, { name: 'يفوق التوقعات', range: '95 إلى 109.9', from: 95, to: 109.9, description: 'حقق وتجاوز' }, { name: 'يحقق التوقعات', range: '80 إلى 94.9', from: 80, to: 94.9, description: 'أدى الدور' }, { name: 'يحتاج تحسينا', range: '65 إلى 79.9', from: 65, to: 79.9, description: 'فجوة' }, { name: 'دون التوقعات', range: 'أقل من 65', from: null, to: 65, description: 'لم يحقق' }];
const INIT = '11111111-1111-4111-8111-111111111111';
const EMPTY: SaveSelfEvaluationInput = { behaviours: {}, achievements: {}, initIds: [], growthIds: [] };
type EvaluationOver = Partial<Omit<NonNullable<MyEvaluationDto['evaluation']>, 'self'>> & { self?: Partial<SelfEvaluationDto> };
const evaluation = (over: EvaluationOver = {}): MyEvaluationDto['evaluation'] => ({
  stage: 2, stageName: 'التخصص', template: TEMPLATE, scale: SCALE, fiscal: { months: [{ month: 'أبريل', kind: 'محطة' }, { month: 'مايو', kind: 'متابعة يومية' }], notes: [{ month: 'يوليو', text: 'المراجعة القصيرة الأولى في 15 يوليو' }] },
  catalog: [{ id: INIT, kind: 'init', title: 'قيادة مبادرة تحسين', points: 4 }], editable: true, managerName: 'فهد الدوسري', learning: { approvedMinutes: 750, stageMinutes: 48 * 60 },
  ...over, self: { ...EMPTY, sentAt: null, ...(over.self ?? {}) },
});
const state = (stage: 'self' | 'mgr' | 'cal', over: EvaluationOver = {}): MyEvaluationDto => ({ cycle: { fiscalYear: 2026, stage, selfDeadline: '2027-03-10' }, evaluation: evaluation({ editable: stage !== 'cal', ...over }) });

function open(mine: MyEvaluationDto) {
  const calls: { method: string; url: string; body: unknown }[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([CorePermission.PerformanceSelfEvaluate].map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/performance/me', () => HttpResponse.json(mine)),
    http.put('*/api/performance/me/self', async ({ request }) => { calls.push({ method: 'PUT', url: new URL(request.url).pathname, body: await request.json() }); return HttpResponse.json(mine); }),
    http.post('*/api/performance/me/self/send', async ({ request }) => { calls.push({ method: 'POST', url: new URL(request.url).pathname, body: await request.json() }); return HttpResponse.json(mine); }),
  );
  renderPage(<EvaluationSection />);
  return { calls };
}

const startForm = async () => fireEvent.click(await screen.findByRole('button', { name: 'بدء التقييم الذاتي' }));

describe('The performance evaluation section of the career path (FR-119)', () => {
  it('says the cycle is not open', async () => {
    open({ cycle: null, evaluation: null });
    expect(await screen.findByText(/لم تُفتح دورة التقييم بعد/)).toBeInTheDocument();
  });

  it('says there is no evaluation for a person whose title has no stage template', async () => {
    open({ cycle: { fiscalYear: 2026, stage: 'self', selfDeadline: null }, evaluation: null });
    expect(await screen.findByText('لا تقييم لك في هذه الدورة')).toBeInTheDocument();
  });

  it('shows the weights and criteria, the behaviours with their questions, the grade scale from the lowest, and the fiscal card', async () => {
    open(state('self'));
    fireEvent.click(await screen.findByRole('tab', { name: 'الأوزان والمعايير' }));
    expect(await screen.findByText('المهام المقبولة')).toBeInTheDocument();
    expect(screen.getByText('يقيم المدير المباشر كل موظف وحده')).toBeInTheDocument();
    expect(screen.getByText('المجموع الأقصى للدرجة النهائية: 125 (السقف).')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'السلوكيات' }));
    expect(await screen.findByText(/هل يلتزم بالمواعيد/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'سلم الدرجات' }));
    const steps = within(await screen.findByRole('list', { name: 'سلم الدرجات من الأدنى إلى الأعلى' })).getAllByRole('listitem');
    expect(steps.map((s) => within(s).getByText(/^(استثنائي|يفوق التوقعات|يحقق التوقعات|يحتاج تحسينا|دون التوقعات)$/).textContent)).toEqual(['دون التوقعات', 'يحتاج تحسينا', 'يحقق التوقعات', 'يفوق التوقعات', 'استثنائي']);
    fireEvent.click(screen.getByRole('tab', { name: 'بطاقة السنة' }));
    expect(await screen.findByText('أبريل')).toBeInTheDocument();
    expect(screen.getByText('المراجعة القصيرة الأولى في 15 يوليو', { exact: false })).toBeInTheDocument();
  });

  it('shows «my evaluation» as not started with the deadline and the button to start', async () => {
    open(state('self'));
    expect(await screen.findByText('دورة التقييم مفتوحة: قيّم نفسك')).toBeInTheDocument();
    expect(screen.getByText(/آخر موعد: 2027-03-10/)).toBeInTheDocument();
    expect(screen.getByText('لم يبدأ')).toBeInTheDocument();
  });

  it('checks the form before sending: levels, and a note where the level asks for one; then sends it', async () => {
    const { calls } = open(state('self'));
    await startForm();
    expect(await screen.findByText('الانضباط')).toBeInTheDocument();
    expect(screen.getByText(/750|12.5 ساعة معتمدة من 48/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إرسال تقييمي الذاتي' }));
    expect(screen.getAllByText('اختر مستوى.')).toHaveLength(2);
    expect(calls).toHaveLength(0);
    const selects = screen.getAllByRole('combobox');
    fireEvent.click(selects[0]!);
    fireEvent.click(await screen.findByRole('option', { name: 'دائمًا' }));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال تقييمي الذاتي' }));
    expect(screen.getByText(/الملاحظة مطلوبة عند هذا المستوى/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('ملاحظة: B2.1'), { target: { value: 'التزمت بكل المواعيد' } });
    fireEvent.click(screen.getAllByRole('combobox')[1]!);
    fireEvent.click(await screen.findByRole('option', { name: 'أحيانًا' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /قيادة مبادرة تحسين/ }));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال تقييمي الذاتي' }));
    await waitFor(() => expect(calls).toEqual([{ method: 'POST', url: '/api/performance/me/self/send', body: { behaviours: { 'B2.1': { level: 100, note: 'التزمت بكل المواعيد' }, 'B2.2': { level: 50, note: '' } }, achievements: {}, initIds: [INIT], growthIds: [] } }]));
  });

  it('keeps a draft without checking it, only before the first send', async () => {
    const { calls } = open(state('self'));
    await startForm();
    fireEvent.change((await screen.findAllByPlaceholderText('اكتب ما أنجزتَه وأدلته'))[0]!, { target: { value: 'مسودة' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ مسودة' }));
    await waitFor(() => expect(calls).toEqual([{ method: 'PUT', url: '/api/performance/me/self', body: { behaviours: {}, achievements: { '0': 'مسودة' }, initIds: [], growthIds: [] } }]));
  });

  it('shows what was sent, who was told, and offers to change it while the stage is open (no draft button then)', async () => {
    open(state('self', { self: { sentAt: '2026-11-09T10:00:00.000Z', behaviours: { 'B2.1': { level: 75, note: 'ملاحظتي' }, 'B2.2': { level: 50, note: '' } } } }));
    expect(await screen.findByText('أرسلتَ تقييمك الذاتي')).toBeInTheDocument();
    expect(screen.getByText(/وصل مديرك فهد الدوسري إشعار/)).toBeInTheDocument();
    expect(screen.getByText('ملاحظتي')).toBeInTheDocument();
    expect(screen.getByText('غالبًا')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تعديل تقييمي الذاتي' }));
    expect(await screen.findByRole('button', { name: 'حفظ التعديل' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حفظ مسودة' })).not.toBeInTheDocument();
  });

  it('after the manager\'s stage began it says it is under review, offers no change, and shows no score', async () => {
    open(state('cal', { self: { sentAt: '2026-11-09T10:00:00.000Z', behaviours: { 'B2.1': { level: 75, note: '' } } } }));
    expect(await screen.findByText(/تقييمك قيد المراجعة \(المعايرة\)/)).toBeInTheDocument();
    expect(screen.getByText('لا تُعرض الدرجات قبل الإبلاغ الفردي بعد الاعتماد.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تعديل تقييمي الذاتي|بدء التقييم الذاتي/ })).not.toBeInTheDocument();
  });

  it('tells the person when saving fails', async () => {
    open(state('self'));
    server.use(http.post('*/api/performance/me/self/send', () => HttpResponse.json({ code: 'SELF_EVALUATION_INVALID', message: 'x' }, { status: 422 })));
    await startForm();
    fireEvent.click((await screen.findAllByRole('combobox'))[0]!);
    fireEvent.click(await screen.findByRole('option', { name: 'غالبًا' }));
    fireEvent.click(screen.getAllByRole('combobox')[1]!);
    fireEvent.click(await screen.findByRole('option', { name: 'أحيانًا' }));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال تقييمي الذاتي' }));
    expect(await screen.findByText(/تعذّر حفظ التقييم الذاتي/)).toBeInTheDocument();
  });
});
