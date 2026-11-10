import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorePermission, type MyEvaluationDto, type MyResultDto } from '@arweqah-platform/shared';
import { toast } from 'sonner';
import { SCALE, FISCAL, CATALOG, stageTemplate } from '../../../test/performance-fixtures';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { EvaluationSection } from './evaluation-section';

const template = stageTemplate(2);
const RESULT = (over: Partial<MyResultDto> = {}): MyResultDto => ({
  finalScore: 92.5, levelName: 'يحقق التوقعات', template, scale: SCALE, catalog: CATALOG, notifiedAt: '2026-11-10T10:00:00.000Z', objectionUntil: '2026-11-17', objection: null, canObject: true,
  breakdown: {
    parts: { results: 80, behaviour: 75, basic: 78, learning: 5, init: 4, growth: 2, final: 91.5 },
    form: { results: { '0': 80, '1': 80, '2': 80, '3': 80 }, behaviours: Object.fromEntries(template.behaviours.map((b) => [b.code, { level: 75, note: 'ملاحظة المدير' }])), initIds: [], growthIds: [] },
    managerScore: 91.5, adjustment: 1, reason: 'مقارنة بأقرانه',
  }, ...over,
});
const MINE = (result: MyResultDto | null): MyEvaluationDto => ({
  cycle: { fiscalYear: 2026, stage: 'notif', selfDeadline: null },
  evaluation: { stage: 2, stageName: template.name, template, scale: SCALE, fiscal: FISCAL, catalog: CATALOG, self: { behaviours: {}, achievements: {}, initIds: [], growthIds: [], sentAt: '2026-11-01T10:00:00.000Z' }, editable: false, managerName: 'خالد', learning: { approvedMinutes: 0, stageMinutes: 2880 } },
  result,
});

function open(mine: MyEvaluationDto, keys: string[] = [CorePermission.PerformanceSelfEvaluate, CorePermission.PerformanceObject, CorePermission.PerformanceExport]) {
  const calls: { url: string; body: unknown }[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/performance/me', () => HttpResponse.json(mine)),
    http.post('*/api/performance/me/objection', async ({ request }) => { calls.push({ url: new URL(request.url).pathname, body: await request.json() }); return HttpResponse.json(RESULT({ canObject: false })); }),
  );
  renderPage(<EvaluationSection />);
  return { calls };
}

beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(toast, 'success').mockReturnValue(1); });

describe('«My result» after the individual notification (FR-123)', () => {
  it('shows the score with its level, my scores, the behaviours with the manager\'s notes, and the calibration with its reason', async () => {
    open(MINE(RESULT()));
    expect(await screen.findByText('درجتك النهائية')).toBeInTheDocument();
    expect(screen.getAllByText('92.5').length).toBeGreaterThan(0);
    expect(screen.getAllByText('يحقق التوقعات').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ملاحظة المدير').length).toBe(template.behaviours.length);
    expect(screen.getByText(/تعديل المعايرة — مقارنة بأقرانه/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'نتيجتي', selected: true })).toBeInTheDocument();
  });

  it('has no «my result» tab and no score before the notification', async () => {
    open(MINE(null));
    expect(await screen.findByRole('tab', { name: 'تقييمي' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'نتيجتي' })).not.toBeInTheDocument();
    expect(screen.queryByText('درجتك النهائية')).not.toBeInTheDocument();
  });

  it('raises the one objection: the item and a reason of ten characters, then the server gets both', async () => {
    const { calls } = open(MINE(RESULT()));
    fireEvent.click(await screen.findByRole('button', { name: 'اعتراض على معيار أو سلوك' }));
    const dialog = await screen.findByRole('dialog');
    const send = within(dialog).getByRole('button', { name: 'إرسال الاعتراض' });
    expect(send).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('سبب الاعتراض'), { target: { value: 'قصير' } });
    expect(send).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText('سبب الاعتراض'), { target: { value: 'أرى أن إنجازي في هذا المعيار أعلى' } });
    fireEvent.click(send);
    await waitFor(() => expect(calls[0]).toMatchObject({ url: '/api/performance/me/objection', body: { itemKind: 'criterion', itemRef: '0', reason: 'أرى أن إنجازي في هذا المعيار أعلى' } }));
  });

  it('shows where the objection stands and no button once it was raised or the window closed', async () => {
    const o = { id: 'o1', itemKind: 'criterion' as const, itemRef: '0', reason: 'سبب', status: 'rejected' as const, decisionReason: 'موثّق ببيانات المعيار', createdAt: '2026-11-11T10:00:00.000Z', decidedAt: '2026-11-12T10:00:00.000Z' };
    open(MINE(RESULT({ objection: o, canObject: false })));
    expect((await screen.findByText(/رُفض اعتراضك/)).parentElement).toHaveTextContent('موثّق ببيانات المعيار');
    expect(screen.queryByRole('button', { name: 'اعتراض على معيار أو سلوك' })).not.toBeInTheDocument();
  });

  it('hides the objection and the export from a person without those keys', async () => {
    open(MINE(RESULT()), [CorePermission.PerformanceSelfEvaluate]);
    await screen.findByText('درجتك النهائية');
    expect(screen.queryByRole('button', { name: 'اعتراض على معيار أو سلوك' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'نسخة قابلة للتصدير' })).not.toBeInTheDocument();
  });
});
