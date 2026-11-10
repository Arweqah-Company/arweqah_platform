import { CorePermission as P, type MeDto, type TaskSummaryDto, type TicketSummaryDto } from '@arweqah-platform/shared';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { taskItem } from '../../../test/task-fixtures';
import { HomePage } from './home-page';

const tasks = (over: Partial<TaskSummaryDto> = {}): TaskSummaryDto => ({
  open: 4, overdue: 1, dueSoon: 2, doneRecently: 5, onTimeRate: 80, awaitingMyReview: 0, awaitingMyApproval: 0,
  byStatus: { todo: 3, in_progress: 1 },
  current: [taskItem({ id: 't1', title: 'تقرير الربع', flags: { urgent: true, overdue: false, stale: false, objected: false } })],
  team: null,
  ...over,
});

const tickets = (over: Partial<TicketSummaryDto> = {}): TicketSummaryDto => ({
  sentOpen: 2, awaitingMyConfirmation: 1, awaitingMyReply: 3,
  sent: [{ id: 'k1', number: 7, title: 'الطابعة لا تعمل', status: 'close_requested', neededBy: '2026-11-12', deskNameAr: 'تقنية المعلومات', deskNameEn: 'IT', isPersonal: false }],
  waiting: [{ id: 'k2', number: 9, title: 'شهادة راتب', status: 'open', neededBy: '2026-11-15', deskNameAr: 'الموارد البشرية', deskNameEn: 'HR', isPersonal: false }],
  ...over,
});

function serve(keys: string[], extra: { tasks?: TaskSummaryDto; tickets?: TicketSummaryDto; hiddenPages?: MeDto['hiddenPages'] } = {}) {
  const asked: string[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json({ ...me(keys.map((key) => ({ key, scope: 'own' as const })), { without: ['tasks.'] }), hiddenPages: extra.hiddenPages ?? [] })),
    http.get('*/api/tasks/summary', () => {
      asked.push('tasks');
      return HttpResponse.json(extra.tasks ?? tasks());
    }),
    http.get('*/api/tasks/matrix', () => HttpResponse.json({ quadrants: [{ key: 'important_urgent', total: 1, items: [taskItem({ id: 'm1', title: 'مهمة في المصفوفة' })] }, { key: 'important_not_urgent', total: 0, items: [] }, { key: 'normal_urgent', total: 0, items: [] }, { key: 'normal_not_urgent', total: 0, items: [] }] })),
    http.get('*/api/tickets/mine-summary', () => {
      asked.push('tickets');
      return HttpResponse.json(extra.tickets ?? tickets());
    }),
  );
  return asked;
}

describe('Home page: my numbers, my tasks and my tickets (FR-57)', () => {
  it('shows my numbers, my current tasks and my tickets to someone who holds both keys', async () => {
    serve([P.TasksView, P.TicketsView]);
    renderPage(<HomePage />);
    const numbers = await screen.findByRole('region', { name: 'أرقامي' });
    expect(within(numbers).getByText('مهامي المفتوحة').closest('a')).toHaveAttribute('href', '/tasks');
    expect(within(numbers).getByText('المهام المتأخرة').closest('a')).toHaveAttribute('href', '/tasks?filter=overdue');
    expect(await within(numbers).findByText('80%')).toBeInTheDocument();
    expect(within(numbers).getByText('بانتظار تأكيدي')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'تقرير الربع' })).toHaveAttribute('href', '/tasks/t1');
    expect(screen.getByRole('link', { name: 'الطابعة لا تعمل' })).toHaveAttribute('href', '/tickets/k1');
    expect(screen.getByText('بانتظار تأكيدك')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'شهادة راتب' })).toBeInTheDocument();
  });

  it('shows the split of my open tasks by status in words and counts', async () => {
    serve([P.TasksView]);
    renderPage(<HomePage />);
    const panel = await screen.findByRole('region', { name: 'مهامي الحالية' });
    expect(within(panel).getByRole('img', { name: 'مهامك المفتوحة حسب الحالة' })).toBeInTheDocument();
    expect(within(panel).getByText('للتنفيذ').nextSibling).toHaveTextContent('3');
  });

  it('leaves the tasks out of the page and never asks for them without the tasks key, or when the page is hidden', async () => {
    const asked = serve([P.TicketsView]);
    const first = renderPage(<HomePage />);
    await screen.findByRole('region', { name: 'تذاكري' });
    expect(screen.queryByRole('region', { name: 'مهامي الحالية' })).not.toBeInTheDocument();
    expect(screen.queryByText('مهامي المفتوحة')).not.toBeInTheDocument();
    expect(asked).not.toContain('tasks');
    first.unmount();
    const hiddenAsk = serve([P.TasksView, P.TicketsView], { hiddenPages: ['tasks'] });
    renderPage(<HomePage />);
    await screen.findByRole('region', { name: 'تذاكري' });
    expect(hiddenAsk).not.toContain('tasks');
    expect(screen.queryByRole('region', { name: 'مهامي الحالية' })).not.toBeInTheDocument();
  });

  it('shows nothing of tasks or tickets when the person holds no tasks key and the tickets page is hidden from them', async () => {
    const asked = serve([], { hiddenPages: ['tickets'] });
    renderPage(<HomePage />);
    await screen.findByRole('heading', { name: /مرحبا|أهلا|سارة/ });
    expect(screen.queryByRole('region', { name: 'أرقامي' })).not.toBeInTheDocument();
    expect(asked).toEqual([]);
  });

  it('adds the team numbers for a manager and the waiting tiles only when there is something to do', async () => {
    serve([P.TasksView], { tasks: tasks({ awaitingMyReview: 2, awaitingMyApproval: 1, team: { overdue: 3, stale: 1, doneThisWeek: 6 } }) });
    renderPage(<HomePage />);
    const numbers = await screen.findByRole('region', { name: 'أرقامي' });
    expect(await within(numbers).findByText('بانتظار مراجعتي')).toBeInTheDocument();
    expect(within(numbers).getByText('بانتظار اعتمادي').closest('a')).toHaveAttribute('href', '/tasks?tab=team');
    expect(within(numbers).getByText('الفريق: متأخرة')).toBeInTheDocument();
    expect(within(numbers).getByText('الفريق: منجزة')).toBeInTheDocument();
  });

  it('says there is nothing open, and offers a new task, to somebody with no tasks', async () => {
    serve([P.TasksView, P.TasksCreate], { tasks: tasks({ open: 0, current: [], byStatus: {}, onTimeRate: null }) });
    renderPage(<HomePage />);
    expect(await screen.findByText('لا توجد عندك مهام مفتوحة.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /مهمة جديدة/ })).toHaveAttribute('href', '/tasks?new=1');
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows the task matrix on the home page to a person who holds its key, and not to others', async () => {
    serve([P.TasksView, P.TasksMatrixView]);
    const first = renderPage(<HomePage />);
    const matrix = await screen.findByRole('region', { name: 'مصفوفة المهام' });
    expect(await within(matrix).findByText('مهمة في المصفوفة')).toBeInTheDocument();
    expect(within(matrix).getByRole('region', { name: /مهمة وعاجلة/ })).toBeInTheDocument();
    first.unmount();
    serve([P.TasksView], {});
    renderPage(<HomePage />);
    await screen.findByRole('region', { name: 'مهامي الحالية' });
    expect(screen.queryByRole('region', { name: 'مصفوفة المهام' })).not.toBeInTheDocument();
  });

  it('leaves the matrix out when its page is hidden from the person', async () => {
    serve([P.TasksView, P.TasksMatrixView], { hiddenPages: ['tasks-matrix'] });
    renderPage(<HomePage />);
    await screen.findByRole('region', { name: 'مهامي الحالية' });
    expect(screen.queryByRole('region', { name: 'مصفوفة المهام' })).not.toBeInTheDocument();
  });
  it('draws the charts of the summaries the person may see, and no shortcuts or recent activity (FR-57)', async () => {
    serve([P.TasksView, P.TicketsView]);
    renderPage(<HomePage />);
    const charts = await screen.findByRole('region', { name: 'رسوم بيانية' });
    expect(await within(charts).findByRole('img', { name: 'رسم دائري لمهامك المفتوحة حسب الحالة' })).toBeInTheDocument();
    expect(within(charts).getByRole('img', { name: /المنجزة في الموعد/ })).toBeInTheDocument();
    expect(within(charts).getByRole('img', { name: 'رسم دائري لتذاكرك حسب الحالة' })).toBeInTheDocument();
    expect(within(charts).getByText('منجزة في الموعد').nextSibling).toHaveTextContent('4');
    expect(screen.queryByText('اختصارات')).not.toBeInTheDocument();
    expect(screen.queryByText('آخر النشاطات')).not.toBeInTheDocument();
  });

  it('leaves the task charts out without the tasks key', async () => {
    serve([P.TicketsView]);
    renderPage(<HomePage />);
    const charts = await screen.findByRole('region', { name: 'رسوم بيانية' });
    expect(await within(charts).findByRole('img', { name: 'رسم دائري لتذاكرك حسب الحالة' })).toBeInTheDocument();
    expect(within(charts).queryByRole('img', { name: 'رسم دائري لمهامك المفتوحة حسب الحالة' })).not.toBeInTheDocument();
  });

  it('never draws a negative «finished late» when the on-time share is above 100 (CodeRabbit, PR 72)', async () => {
    serve([P.TasksView], { tasks: tasks({ doneRecently: 5, onTimeRate: 150 }) });
    renderPage(<HomePage />);
    const charts = await screen.findByRole('region', { name: 'رسوم بيانية' });
    expect((await within(charts).findByText('منجزة متأخرة')).nextSibling).toHaveTextContent(/^0$/);
    expect(within(charts).getByText('منجزة في الموعد').nextSibling).toHaveTextContent(/^5$/);
  });
});
