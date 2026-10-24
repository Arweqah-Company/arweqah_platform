import { CorePermission as P, riyadhToday } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { taskDetail } from '../../../../test/task-fixtures';
import { NewTaskDialog } from './new-task-dialog';

const options = (approver: { id: string; name: string } | null) => ({
  assignees: [{ id: 'u1', name: 'سارة أحمد', isSelf: true }, { id: 'u9', name: 'خالد علي', isSelf: false }],
  tags: [{ id: 'g1', orgNodeId: 'n1', nameAr: 'تقارير', nameEn: 'Reports', isActive: true }],
  approver,
});

function serve(approver: { id: string; name: string } | null = { id: 'm1', name: 'منى خالد' }) {
  const posted: Record<string, unknown>[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me([{ key: P.TasksCreate, scope: 'all' }]))),
    http.get('*/api/tasks/options', () => HttpResponse.json(options(approver))),
    http.post('*/api/tasks', async ({ request }) => {
      posted.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(taskDetail({ id: 'new-task' }), { status: 201 });
    }),
  );
  return posted;
}

const closed: boolean[] = [];
const page = () => renderPage(<NewTaskDialog open onOpenChange={(open) => closed.push(open)} />);

describe('New task popup (FR-48)', () => {
  it('starts with the defaults: me, today, medium priority, no repeat', async () => {
    serve();
    page();
    const assignee = await screen.findByLabelText(/المسند إليه/);
    await waitFor(() => expect(assignee).toHaveValue('u1'));
    expect(screen.getByLabelText(/الموعد/)).toHaveValue(riyadhToday());
    expect(screen.getByLabelText('الأولوية')).toHaveValue('medium');
    expect(screen.getByLabelText('التكرار')).toHaveValue('none');
    expect(screen.getByRole('button', { name: 'إنشاء المهمة' })).toBeDisabled();
  });

  it('says who approves a task for oneself before saving, and that nobody does when there is no manager', async () => {
    serve();
    const first = page();
    expect(await screen.findByText(/فيعتمدها منى خالد/)).toBeInTheDocument();
    first.unmount();
    serve(null);
    page();
    expect(await screen.findByText(/ولا يلزم أن يعتمدها أحد/)).toBeInTheDocument();
  });

  it('hides the approval note when the task is for somebody else', async () => {
    serve();
    page();
    await screen.findByRole('option', { name: 'خالد علي' });
    fireEvent.change(screen.getByLabelText(/المسند إليه/), { target: { value: 'u9' } });
    await waitFor(() => expect(screen.queryByText(/فيعتمدها/)).not.toBeInTheDocument());
  });

  it('sends what was written, with the estimate in minutes, and closes the popup', async () => {
    const posted = serve();
    page();
    fireEvent.change(await screen.findByLabelText(/العنوان/), { target: { value: 'إعداد تقرير الربع' } });
    fireEvent.change(screen.getByLabelText(/الوقت المتوقع/), { target: { value: '1.5' } });
    fireEvent.change(screen.getByLabelText('الأولوية'), { target: { value: 'high' } });
    fireEvent.change(screen.getByLabelText('الفئة'), { target: { value: 'g1' } });
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء المهمة' }));
    await waitFor(() => expect(closed).toContain(false));
    expect(posted[0]).toMatchObject({ title: 'إعداد تقرير الربع', priority: 'high', estimateMinutes: 90, tagId: 'g1', dueDate: riyadhToday(), recurrence: 'none', urgent: false, needsReview: false });
    expect(posted[0]).not.toHaveProperty('assigneeUserId', 'u1');
  });

  it('shows the date of a past due day as an error while the person types', async () => {
    serve();
    page();
    const due = await screen.findByLabelText(/الموعد/);
    fireEvent.change(due, { target: { value: '2020-01-01' } });
    fireEvent.blur(due);
    expect(await screen.findByText('لا يمكن أن يكون الموعد في الماضي.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/العنوان/), { target: { value: 'مهمة' } });
    expect(screen.getByRole('button', { name: 'إنشاء المهمة' })).toBeDisabled();
  });

  it('asks when a repeating task ends only when it repeats', async () => {
    serve();
    page();
    await screen.findByLabelText('التكرار');
    expect(screen.queryByLabelText('يتكرر حتى')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('التكرار'), { target: { value: 'weekly' } });
    expect(await screen.findByLabelText('يتكرر حتى')).toBeInTheDocument();
  });
});
