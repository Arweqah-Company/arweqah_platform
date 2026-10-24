import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { taskDetail, taskItem } from '../../../../test/task-fixtures';
import { TaskBoard } from './task-board';

const todo = taskItem({ id: 't1', title: 'مهمة للتنفيذ', status: 'todo' });
const progress = taskItem({ id: 't2', title: 'مهمة جارية', status: 'in_progress', revision: 3 });
const waiting = taskItem({ id: 't3', title: 'تنتظر الاعتماد', status: 'pending_approval' });
const rejected = taskItem({ id: 't4', title: 'مهمة مرفوضة', status: 'rejected' });
const lanes = [{ id: 'all', tasks: [todo, progress, waiting, rejected] }];
const column = (name: string) => screen.getByRole('region', { name });

/** Records every move the board asks the API for, and answers with `reply`. */
function serve(reply: () => Response) {
  const calls: { id: string; body: Record<string, unknown> }[] = [];
  server.use(
    http.post('*/api/tasks/:id/transition', async ({ request, params }) => {
      calls.push({ id: String(params.id), body: (await request.json()) as Record<string, unknown> });
      return reply();
    }),
  );
  return calls;
}
const refusal = (code: string, details?: object) => () => HttpResponse.json({ statusCode: 422, code, message: 'no', details }, { status: 422 });

describe('The Kanban board (FR-50)', () => {
  it('puts every task in the column of its status, with its count', () => {
    renderPage(<TaskBoard lanes={lanes} today="2026-11-01" />);
    expect(within(column('للتنفيذ')).getByText('مهمة للتنفيذ')).toBeInTheDocument();
    expect(within(column('قيد التنفيذ')).getByText('مهمة جارية')).toBeInTheDocument();
    expect(within(column('بانتظار الاعتماد')).getByText('تنتظر الاعتماد')).toBeInTheDocument();
    expect(within(column('مرفوضة')).getByText('مهمة مرفوضة')).toBeInTheDocument();
    expect(within(column('للتنفيذ')).getByText('1')).toBeInTheDocument();
    expect(within(column('مكتملة')).getByText('0')).toBeInTheDocument();
  });

  it('does not let a card waiting for approval, or a rejected one, be moved by hand', () => {
    renderPage(<TaskBoard lanes={lanes} today="2026-11-01" />);
    expect(within(column('بانتظار الاعتماد')).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(column('مرفوضة')).queryByRole('button', { name: /اسحب/ })).not.toBeInTheDocument();
    expect(within(column('للتنفيذ')).getByRole('button', { name: /اسحب المهمة مهمة للتنفيذ/ })).toBeInTheDocument();
  });

  it('asks the API for the move with the task\'s revision, and shows the card in its new column at once', async () => {
    const calls = serve(() => HttpResponse.json(taskDetail({ id: 't1', status: 'in_progress' })));
    renderPage(<TaskBoard lanes={lanes} today="2026-11-01" />);
    fireEvent.change(screen.getByLabelText(/انقل المهمة مهمة للتنفيذ إلى/), { target: { value: 'in_progress' } });
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ id: 't1', body: { to: 'in_progress', revision: 1 } });
  });

  it('puts the card back in its column when the API refuses the move', async () => {
    const calls = serve(refusal('TASK_TRANSITION_NOT_ALLOWED', { from: 'todo', to: 'done', reason: 'NOT_ALLOWED_PATH' }));
    renderPage(<TaskBoard lanes={lanes} today="2026-11-01" />);
    fireEvent.change(screen.getByLabelText(/انقل المهمة مهمة للتنفيذ إلى/), { target: { value: 'done' } });
    await waitFor(() => expect(calls).toHaveLength(1));
    await waitFor(() => expect(within(column('للتنفيذ')).getByText('مهمة للتنفيذ')).toBeInTheDocument());
    expect(within(column('مكتملة')).queryByText('مهمة للتنفيذ')).not.toBeInTheDocument();
  });

});

describe('The Kanban board asks for what the API needs (FR-50)', () => {
  it('asks for a note when the API says one is needed, then sends the move again with it', async () => {
    let first = true;
    const calls = serve(() => {
      if (first) {
        first = false;
        return refusal('TASK_NOTE_REQUIRED')();
      }
      return HttpResponse.json(taskDetail({ id: 't2', status: 'in_progress' }));
    });
    const inReview = taskItem({ id: 't2', title: 'تنتظر المراجعة', status: 'awaiting_review', revision: 4 });
    renderPage(<TaskBoard lanes={[{ id: 'all', tasks: [inReview] }]} today="2026-11-01" />);
    fireEvent.change(screen.getByLabelText(/انقل المهمة تنتظر المراجعة إلى/), { target: { value: 'in_progress' } });
    const note = await screen.findByLabelText(/الملاحظة/);
    fireEvent.change(note, { target: { value: 'ينقصه ملخص' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]?.body).toEqual({ to: 'in_progress', revision: 4, note: 'ينقصه ملخص' });
  });

  it('asks for the real completion date when the API says the task is too late, then sends it', async () => {
    let first = true;
    const calls = serve(() => {
      if (first) {
        first = false;
        return refusal('TASK_COMPLETION_DATE_REQUIRED')();
      }
      return HttpResponse.json(taskDetail({ id: 't2', status: 'done' }));
    });
    renderPage(<TaskBoard lanes={[{ id: 'all', tasks: [progress] }]} today="2026-11-01" />);
    fireEvent.change(screen.getByLabelText(/انقل المهمة مهمة جارية إلى/), { target: { value: 'done' } });
    const date = await screen.findByLabelText(/تاريخ الإنجاز/);
    expect(date).toHaveAttribute('max', '2026-11-01');
    fireEvent.change(date, { target: { value: '2026-10-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]?.body).toEqual({ to: 'done', revision: 3, completedOn: '2026-10-30' });
  });

  it('draws one row for each person when asked (swimlanes)', () => {
    renderPage(
      <TaskBoard
        today="2026-11-01"
        lanes={[
          { id: 'u1', label: 'سارة أحمد', tasks: [todo] },
          { id: 'u9', label: 'خالد علي', tasks: [taskItem({ id: 't9', title: 'مهمة خالد' })] },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'سارة أحمد' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'خالد علي' })).toBeInTheDocument();
    expect(screen.getAllByRole('region', { name: 'للتنفيذ' })).toHaveLength(2);
  });
});
