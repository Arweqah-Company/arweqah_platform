import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CorePermission, type MilestoneListDto } from '@arweqah-platform/shared';
import { toast } from 'sonner';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { MemberMilestonesDialog } from './member-milestones-dialog';
import { MyMilestones } from './my-milestones';

const record = { whereWeAre: 'نسير وفق الخطة', obstacle: 'ضيق الوقت', agreedAction: 'مراجعة الأولويات', note: '', recordedAt: '2026-07-15T10:00:00.000Z', acknowledgedAt: null };
const LIST = (over: Partial<MilestoneListDto['items'][number]> = {}): MilestoneListDto => ({
  fiscalYear: 2026,
  items: [
    { key: 'review_jan', kind: 'review', month: 1, day: 15, state: 'none', record: null },
    { key: 'pulse_mar', kind: 'pulse', month: 3, day: 15, state: 'none', record: null },
    { key: 'review_jul', kind: 'review', month: 7, day: 15, state: 'recorded', record, ...over },
    { key: 'pulse_sep', kind: 'pulse', month: 9, day: 15, state: 'none', record: null },
    { key: 'warning_oct', kind: 'warning', month: 10, day: 20, state: 'skipped', record: null },
  ],
});

type Call = { method: string; url: string; body: unknown };

function open(keys: string[], list: MilestoneListDto = LIST()) {
  const calls: Call[] = [];
  const answer = async (request: Request) => { calls.push({ method: request.method, url: new URL(request.url).pathname, body: await request.json().catch(() => null) }); return HttpResponse.json(list); };
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'all' as const }))))),
    http.get('*/api/performance/team/:id/milestones', () => HttpResponse.json(list)),
    http.put('*/api/performance/team/:id/milestones/:key', ({ request }) => answer(request)),
    http.get('*/api/performance/me/milestones', () => HttpResponse.json(list)),
    http.post('*/api/performance/me/milestones/:key/acknowledge', ({ request }) => answer(request)),
  );
  return { calls };
}

beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(toast, 'success').mockReturnValue(1); });

describe('The milestones of the year (FR-121)', () => {
  it('shows the manager the five milestones with their state, and no button for the one that does not run', async () => {
    open([CorePermission.PerformanceMilestoneView, CorePermission.PerformanceMilestoneRecord]);
    renderPage(<MemberMilestonesDialog employeeId="e1" name="سارة أحمد" onClose={() => undefined} />);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('لا تجري هذا العام')).toBeInTheDocument();
    expect(within(dialog).getByText('مسجّلة')).toBeInTheDocument();
    expect(await within(dialog).findByRole('button', { name: 'عدّل المحضر: مراجعة قصيرة (يوليو)' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /الدرجة الإنذارية/ })).not.toBeInTheDocument();
  });

  it('records a review: the agreed action is required, and the server gets the minutes', async () => {
    const { calls } = open([CorePermission.PerformanceMilestoneView, CorePermission.PerformanceMilestoneRecord]);
    renderPage(<MemberMilestonesDialog employeeId="e1" name="سارة أحمد" onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'سجّل المحضر: مراجعة قصيرة (يناير)' }));
    const form = (await screen.findAllByRole('dialog')).at(-1)!;
    const save = within(form).getByRole('button', { name: 'حفظ المحضر' });
    expect(save).toBeDisabled();
    fireEvent.change(within(form).getByLabelText('الإجراء المتفق عليه'), { target: { value: 'مراجعة الأولويات أسبوعيًا' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(calls[0]).toMatchObject({ method: 'PUT', url: '/api/performance/team/e1/milestones/review_jan', body: expect.objectContaining({ agreedAction: 'مراجعة الأولويات أسبوعيًا' }) }));
  });

  it('hides the record button from a manager who only views', async () => {
    open([CorePermission.PerformanceMilestoneView]);
    renderPage(<MemberMilestonesDialog employeeId="e1" name="سارة أحمد" onClose={() => undefined} />);
    await screen.findByText('لا تجري هذا العام');
    expect(screen.queryByRole('button', { name: /المحضر:/ })).not.toBeInTheDocument();
  });

  it('shows the employee the minutes the manager recorded and lets them acknowledge reading them', async () => {
    const { calls } = open([CorePermission.PerformanceMilestoneAck]);
    renderPage(<MyMilestones />);
    expect(await screen.findByText('ضيق الوقت')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'اطّلعت على المحضر' }));
    await waitFor(() => expect(calls[0]).toMatchObject({ method: 'POST', url: '/api/performance/me/milestones/review_jul/acknowledge' }));
  });

  it('offers no acknowledgement once it was given', async () => {
    open([CorePermission.PerformanceMilestoneAck], LIST({ state: 'acknowledged', record: { ...record, acknowledgedAt: '2026-07-16T10:00:00.000Z' } }));
    renderPage(<MyMilestones />);
    await screen.findByText('ضيق الوقت');
    expect(screen.queryByRole('button', { name: 'اطّلعت على المحضر' })).not.toBeInTheDocument();
  });
});
