import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorePermission, type EvalBlock, type SaveTeamEvaluationInput, type TeamEvaluationDto, type TeamEvaluationPageDto, type TeamEvaluationRowDto } from '@arweqah-platform/shared';
import { toast } from 'sonner';
import { CATALOG, SCALE, FISCAL, stageTemplate } from '../../../test/performance-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { TeamEvaluationPage } from './team-page';

const KEYS = [CorePermission.PerformanceTeamView, CorePermission.PerformanceTeamEvaluate, CorePermission.PerformanceTeamExport];
const ROW = (over: Partial<TeamEvaluationRowDto> = {}): TeamEvaluationRowDto => ({ employeeId: 'e1', name: 'سارة أحمد', titleNameAr: 'موظف مبيعات', titleNameEn: 'Sales rep', directManagerName: null, isDirect: true, selfSent: true, mine: 'none', score: null, levelName: null, block: null, ...over });
const PAGE = (items: TeamEvaluationRowDto[], over: Partial<TeamEvaluationPageDto> = {}): TeamEvaluationPageDto => ({ cycle: { fiscalYear: 2026, stage: 'mgr' }, items, total: items.length, page: 1, pageSize: 25, waitingCount: items.filter((r) => r.mine !== 'sent' && !r.block).length, ...over });
const EMPTY: SaveTeamEvaluationInput = { results: {}, behaviours: {}, initIds: [], growthIds: [] };
const template = stageTemplate(2);
const DTO = (over: Partial<TeamEvaluationDto> = {}): TeamEvaluationDto => ({
  employeeId: 'e1', name: 'سارة أحمد', titleNameAr: 'موظف مبيعات', titleNameEn: 'Sales rep', stage: 2, template, scale: SCALE, fiscal: FISCAL, catalog: CATALOG, catalogCaps: { init: 10, growth: 5 }, learning: { approvedMinutes: 1440, stageMinutes: 2880 },
  self: { behaviours: { 'B2.1': { level: 75, note: 'التزمت' } }, achievements: {}, initIds: ['i1'], growthIds: [], sentAt: '2026-11-09T10:00:00.000Z' }, level: 'direct', directManagerName: 'أنت', upperManagerName: 'خالد المدير',
  form: EMPTY, sentAt: null, directForm: null, block: null, score: null, levelName: null, ...over,
});
/** A form that scores every criterion 80 and rates every behaviour «often». */
const FULL: SaveTeamEvaluationInput = { results: { '0': 80, '1': 80, '2': 80, '3': 80 }, behaviours: Object.fromEntries([1, 2, 3, 4].map((i) => [`B2.${i}`, { level: 75, note: '' }])), initIds: ['i1'], growthIds: ['i2'] };

type Call = { method: string; url: string; body: unknown };

function open(page: TeamEvaluationPageDto, dto: TeamEvaluationDto = DTO(), keys: string[] = KEYS) {
  window.localStorage.setItem('view:performance-team', 'table');
  const calls: Call[] = [];
  const write = async (request: Request) => { calls.push({ method: request.method, url: new URL(request.url).pathname, body: await request.json() }); return HttpResponse.json(dto); };
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'subtree' as const }))))),
    http.get('*/api/performance/team', ({ request }) => { calls.push({ method: 'GET', url: new URL(request.url).search, body: null }); return HttpResponse.json(page); }),
    http.get('*/api/performance/team/:id', () => HttpResponse.json(dto)),
    http.put('*/api/performance/team/:id', ({ request }) => write(request)),
    http.post('*/api/performance/team/:id/send', ({ request }) => write(request)),
  );
  renderPage(<TeamEvaluationPage />);
  return { calls };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(toast, 'success').mockReturnValue(1);
  vi.spyOn(toast, 'info').mockReturnValue(1);
});

const openRow = async (name = 'سارة أحمد') => fireEvent.click(await within(await screen.findByRole('table', { name: 'تقييم فريقي' })).findByText(name));
const fill = async () => { for (const input of await screen.findAllByRole('spinbutton')) fireEvent.change(input, { target: { value: '80' } }); };
const rate = async (index: number, option: string) => { fireEvent.click(screen.getAllByRole('combobox')[index]!); fireEvent.click(await screen.findByRole('option', { name: option })); };

describe('The team evaluation page (FR-120)', () => {
  it('lists the team with the direct manager («you» or the name with an indirect mark), the self-evaluation state, the viewer\'s state, the score and the level', async () => {
    open(PAGE([ROW(), ROW({ employeeId: 'e2', name: 'منى علي', isDirect: false, directManagerName: 'فهد الدوسري', selfSent: false, mine: 'sent', score: 91.5, levelName: 'يحقق التوقعات' })]));
    const table = await screen.findByRole('table', { name: 'تقييم فريقي' });
    await within(table).findByText('منى علي');
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]!).getByText('أنت')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('لم يبدأ')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('فهد الدوسري')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('غير مباشر')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('91.5')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('يحقق التوقعات')).toBeInTheDocument();
    expect(screen.getByText('1 من فريقك بانتظار تقييمك.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'سارة أحمد أرسل تقييمه الذاتي وينتظر مراجعتك' })).toBeInTheDocument(); // the name is a link that opens the window
  });

  it('asks the server for the search, the scope and the status the person chose', async () => {
    const { calls } = open(PAGE([ROW()]));
    await screen.findByRole('table', { name: 'تقييم فريقي' });
    fireEvent.change(screen.getByRole('searchbox', { name: 'بحث في الفريق' }), { target: { value: 'سارة' } });
    await waitFor(() => expect(calls.some((c) => c.method === 'GET' && c.url.includes('search='))).toBe(true));
  });

  it('says the cycle is not open', async () => {
    open(PAGE([], { cycle: null }));
    expect(await screen.findByText('لم تُفتح دورة التقييم بعد.')).toBeInTheDocument();
  });

  it('opens the window from a click on the row, shows what the employee said under each behaviour and marks the items they claimed', async () => {
    open(PAGE([ROW()]));
    await openRow();
    const dialog = await screen.findByRole('dialog', { name: 'تقييم سارة أحمد' });
    expect(await within(dialog).findByText(/الموظف: غالبًا · التزمت/)).toBeInTheDocument();
    expect(within(dialog).getByText('ادّعاه الموظف')).toBeInTheDocument();
    expect(within(dialog).getByText(/بعد إرسالك يذهب التقييم إلى خالد المدير ثم المعايرة/)).toBeInTheDocument();
  });

  it('computes the live card with the formula as the fields are filled', async () => {
    open(PAGE([ROW()]));
    await openRow();
    await fill();
    const card = await screen.findByRole('region', { name: 'الدرجة النهائية الحيّة' });
    // results 80 → basic 80×0.6 + behaviours 0 → 48; learning 24 of 48 h → 5; picks 0
    await waitFor(() => expect(within(card).getAllByText('53').length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole('checkbox', { name: /قيادة مبادرة تحسين/ }));
    await waitFor(() => expect(within(card).getAllByText('57').length).toBeGreaterThan(0)); // + the 4 points of the initiative
    expect(within(card).getByText('من 125')).toBeInTheDocument();
  });

  it('checks the form before sending, names the fields, and sends nothing until it is complete', async () => {
    const { calls } = open(PAGE([ROW()]));
    await openRow();
    fireEvent.click(await screen.findByRole('button', { name: 'إرسال التقييم' }));
    expect(await screen.findAllByText('أدخل رقمًا من 0 إلى 100.')).toHaveLength(4);
    expect(screen.getAllByText('اختر مستوى.')).toHaveLength(4);
    expect(calls.filter((c) => c.method === 'POST')).toHaveLength(0);
  });

  it('sends the complete form with the scores, the levels and the picks', async () => {
    const { calls } = open(PAGE([ROW()]));
    await openRow();
    await fill();
    for (let i = 0; i < 4; i += 1) await rate(i, 'غالبًا');
    fireEvent.click(screen.getByRole('checkbox', { name: /قيادة مبادرة تحسين/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /مساهمة في ورشة/ }));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال التقييم' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')).toMatchObject({ url: '/api/performance/team/e1/send', body: FULL }));
    expect(toast.success).toHaveBeenCalledWith('أُرسل التقييم.');
  });

  it('keeps a draft without checking it', async () => {
    const { calls } = open(PAGE([ROW()]));
    await openRow();
    fireEvent.change((await screen.findAllByRole('spinbutton'))[0]!, { target: { value: '70' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ مسودة' }));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT')).toMatchObject({ url: '/api/performance/team/e1', body: { results: { '0': 70 }, behaviours: {}, initIds: [], growthIds: [] } }));
  });

  it.each<[EvalBlock, string]>([
    ['not_started', 'مرحلة تقييم المدير لم تبدأ بعد، والمرحلة الحالية: التقييم الذاتي.'],
    ['wait_direct', 'بانتظار مراجعة فهد الدوسري (مديره المباشر) أولًا.'],
    ['stage_over', 'انتهت مرحلة تقييم المدير: التقييم للعرض فقط.'],
  ])('when writing is blocked (%s) the window says why, locks the fields, and the send button explains when pressed', async (block, words) => {
    open(PAGE([ROW({ block })]), DTO({ block, directManagerName: 'فهد الدوسري' }));
    await openRow();
    const dialog = await screen.findByRole('dialog', { name: 'تقييم سارة أحمد' });
    expect(await within(dialog).findByText(words)).toBeInTheDocument();
    for (const input of within(dialog).getAllByRole('spinbutton')) expect(input).toBeDisabled();
    expect(within(dialog).queryByRole('button', { name: 'حفظ مسودة' })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إرسال التقييم' }));
    expect(toast.info).toHaveBeenCalledWith(words);
  });

  it('shows the upper manager the direct manager\'s rating, and an edit button once the evaluation was sent', async () => {
    open(PAGE([ROW({ isDirect: false, directManagerName: 'فهد الدوسري', mine: 'sent' })]), DTO({ level: 'upper', directManagerName: 'فهد الدوسري', form: FULL, directForm: { ...FULL, behaviours: { 'B2.1': { level: 50, note: '' } } }, sentAt: '2026-11-10T08:00:00.000Z' }));
    await openRow();
    expect(await screen.findByText(/فهد الدوسري: أحيانًا/)).toBeInTheDocument();
    expect(screen.getByText(/تراجع تقييم فهد الدوسري وتعدّله/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ التعديل' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'حفظ مسودة' })).not.toBeInTheDocument();
  });

  it('hides the export for a person without its key', async () => {
    open(PAGE([ROW()]), DTO(), [CorePermission.PerformanceTeamView]);
    await screen.findByRole('table', { name: 'تقييم فريقي' });
    expect(screen.queryByRole('button', { name: /تصدير/ })).not.toBeInTheDocument();
  });
});

