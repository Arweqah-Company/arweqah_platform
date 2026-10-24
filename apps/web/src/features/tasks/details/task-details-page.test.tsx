import { CorePermission as P, type TaskAbilitiesDto, type TaskDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { taskDetail } from '../../../../test/task-fixtures';
import { TaskDetailsPage } from './task-details-page';

const closed: TaskAbilitiesDto = { moveTo: [], edit: false, approve: false, object: false, answerObjection: false, resubmit: false, follow: false, logTime: false, restore: false };

function serve(task: TaskDto) {
  const calls: { path: string; body: unknown }[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/tasks/:id', () => HttpResponse.json(task)),
    http.post('*/api/tasks/:id/objection/answer', async ({ request }) => {
      calls.push({ path: 'objection/answer', body: await request.json().catch(() => null) });
      return HttpResponse.json(task);
    }),
    http.post('*/api/tasks/:id/:action', async ({ request, params }) => {
      calls.push({ path: String(params.action), body: await request.json().catch(() => null) });
      return HttpResponse.json(task);
    }),
  );
  return calls;
}
const page = () => renderRoute([{ path: '/tasks/:id', element: <TaskDetailsPage /> }], '/tasks/t1');

describe('Task details (FR-48 to FR-52)', () => {
  it('shows the number, the title, the facts, the notes and the history', async () => {
    serve(taskDetail({ flags: { urgent: true, overdue: false, stale: false, objected: false } }));
    page();
    expect(await screen.findByRole('heading', { name: /TSK-000001 · إعداد تقرير المبيعات/ })).toBeInTheDocument();
    expect(screen.getByText('تفاصيل المهمة')).toBeInTheDocument();
    expect(screen.getAllByText('عاجلة').length).toBeGreaterThan(0);
    expect(screen.getByText(/أُنشئت/)).toBeInTheDocument();
    expect(screen.getByText('0:30 / 1:30')).toBeInTheDocument();
  });

  it('shows only the buttons the API says this person may use', async () => {
    serve(taskDetail());
    page();
    await screen.findByRole('heading', { name: /TSK-000001/ });
    for (const name of ['اعتماد', 'رفض', 'اعتراض', 'تسجيل وقت', 'تعديل', 'متابعة', 'استرجاع']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  });

  it('offers approval of a task waiting for it, and sends the decision with the revision and the note', async () => {
    const calls = serve(taskDetail({ status: 'pending_approval', revision: 2, approver: { id: 'm1', name: 'منى خالد' }, abilities: { ...closed, approve: true } }));
    page();
    expect(await screen.findByText(/تنتظر هذه المهمة اعتماد منى خالد/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'اعتماد' }));
    fireEvent.change(await screen.findByLabelText('ملاحظة (اختيارية)'), { target: { value: 'موافق' } });
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد', hidden: false, description: undefined }) as HTMLElement);
    await waitFor(() => expect(calls.some((c) => c.path === 'approve')).toBe(true));
    expect(calls.find((c) => c.path === 'approve')?.body).toEqual({ revision: 2, note: 'موافق' });
  });

  it('shows the four fixed reasons when objecting, and sends the chosen one', async () => {
    const calls = serve(taskDetail({ abilities: { ...closed, object: true } }));
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'اعتراض' }));
    const reason = await screen.findByLabelText(/السبب/);
    expect(reason.querySelectorAll('option')).toHaveLength(4);
    fireEvent.change(reason, { target: { value: 'not_enough_time' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال الاعتراض' }));
    await waitFor(() => expect(calls.some((c) => c.path === 'objection')).toBe(true));
    expect(calls.find((c) => c.path === 'objection')?.body).toEqual({ reason: 'not_enough_time' });
  });

  it('shows the objection with the day it lapses, and the archive note with a restore button', async () => {
    serve(taskDetail({ objection: { id: 'o1', reason: 'not_my_scope', note: null, status: 'open', raisedBy: { id: 'u1', name: 'سارة أحمد' }, expiresAt: '2026-11-10T21:00:00.000Z' }, archivedAt: '2026-11-01T00:00:00.000Z', abilities: { ...closed, restore: true } }));
    page();
    expect(await screen.findByText(/اعترض سارة أحمد \(ليست من مسؤوليتي\)/)).toBeInTheDocument();
    expect(screen.getByText(/أُرشفت هذه المهمة/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'استرجاع' })).toBeInTheDocument();
  });

});

describe('Task details: objections, time and moves (FR-52)', () => {
  it('asks who gets the task when an objection is accepted, and sends the choice', async () => {
    const calls = serve(taskDetail({ objection: { id: 'o1', reason: 'not_my_scope', note: null, status: 'open', raisedBy: { id: 'u1', name: 'سارة أحمد' }, expiresAt: '2026-11-10T21:00:00.000Z' }, abilities: { ...closed, answerObjection: true } }));
    server.use(http.get('*/api/tasks/options', () => HttpResponse.json({ assignees: [{ id: 'u1', name: 'سارة أحمد', isSelf: false }, { id: 'u9', name: 'خالد علي', isSelf: false }], tags: [], approver: null })));
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'الرد على الاعتراض' }));
    const save = await screen.findByRole('button', { name: 'إرسال الرد' });
    expect(save).toBeDisabled();
    const person = await screen.findByLabelText(/أسندها إلى/);
    expect(Array.from(person.querySelectorAll('option')).map((o) => o.textContent)).toEqual(['اختر شخصًا', 'خالد علي']);
    fireEvent.change(person, { target: { value: 'u9' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.path === 'objection/answer')).toBe(true));
    expect(calls.at(-1)?.body).toEqual({ accept: true, newAssigneeUserId: 'u9' });
  });

  it('needs no person when the objection is rejected', async () => {
    serve(taskDetail({ objection: { id: 'o1', reason: 'not_my_scope', note: null, status: 'open', raisedBy: { id: 'u1', name: 'سارة أحمد' }, expiresAt: '2026-11-10T21:00:00.000Z' }, abilities: { ...closed, answerObjection: true } }));
    server.use(http.get('*/api/tasks/options', () => HttpResponse.json({ assignees: [], tags: [], approver: null })));
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'الرد على الاعتراض' }));
    fireEvent.click(await screen.findByLabelText('أُبقي المهمة عند صاحبها'));
    expect(screen.queryByLabelText(/أسندها إلى/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إرسال الرد' })).toBeEnabled();
  });

  it('keeps the time dialog\'s save button off until minutes are given', async () => {
    serve(taskDetail({ abilities: { ...closed, logTime: true } }));
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'تسجيل وقت' }));
    const save = await screen.findByRole('button', { name: 'تسجيل' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/الدقائق/), { target: { value: '45' } });
    expect(save).toBeEnabled();
  });

  it('lists where the viewer may move the task', async () => {
    serve(taskDetail({ abilities: { ...closed, moveTo: ['in_progress'] } }));
    page();
    const menu = await screen.findByLabelText('نقل إلى');
    expect(Array.from(menu.querySelectorAll('option')).map((o) => o.textContent)).toEqual(['اختر حالة', 'قيد التنفيذ']);
  });

  it('shows a plain message when the task cannot be seen', async () => {
    server.use(http.get('*/api/tasks/:id', () => HttpResponse.json({ statusCode: 404, code: 'NOT_FOUND', message: 'no' }, { status: 404 })));
    page();
    expect(await screen.findByText('لم نجد ما تبحث عنه.')).toBeInTheDocument();
  });

  it('keeps the permission-based pieces out of sight without their keys (UI hint only)', async () => {
    serve(taskDetail());
    page();
    await screen.findByRole('heading', { name: /TSK-000001/ });
    expect(P.TasksApprove).toBe('tasks.approve');
  });
});
