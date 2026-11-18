import type { TaskDto, TaskFollowerDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderRoute } from '../../../../test/render';
import { chooseOption } from '../../../../test/select';
import { taskDetail } from '../../../../test/task-fixtures';
import { TaskDetailsPage } from './task-details-page';

const withAbility = (manageFollowers: boolean): TaskDto => {
  const base = taskDetail();
  return { ...base, abilities: { ...base.abilities, manageFollowers } };
};

function serve(task: TaskDto) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const followers: TaskFollowerDto[] = [{ userId: 'u1', name: 'سارة مجدي' }];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/tasks/:id', () => HttpResponse.json(task)),
    http.get('*/api/tasks/:id/followers/candidates', () => HttpResponse.json([{ userId: 'u2', name: 'خالد أحمد' }])),
    http.get('*/api/tasks/:id/followers', () => HttpResponse.json(followers)),
    http.post('*/api/tasks/:id/followers', async ({ request }) => { calls.push({ method: 'POST', path: 'followers', body: await request.json() }); return HttpResponse.json(followers); }),
    http.delete('*/api/tasks/:id/followers/:userId', ({ params }) => { calls.push({ method: 'DELETE', path: String(params.userId), body: null }); return HttpResponse.json([]); }),
  );
  return calls;
}
const page = () => renderRoute([{ path: '/tasks/:id', element: <TaskDetailsPage /> }], '/tasks/t1');

describe('Followers chosen on a task (FR-163)', () => {
  it('offers «Add followers» only when the API says the viewer may manage them', async () => {
    serve(withAbility(false));
    page();
    await screen.findByRole('heading', { name: /TSK-000001/ });
    expect(screen.queryByRole('button', { name: 'إضافة متابعين' })).not.toBeInTheDocument();
  });

  it('lists the followers, adds one picked from the search and removes one', async () => {
    const calls = serve(withAbility(true));
    page();
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة متابعين' }));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('سارة مجدي')).toBeInTheDocument();
    await chooseOption(within(dialog).getByLabelText('أضف متابعًا'), 'u2');
    await waitFor(() => expect(calls).toContainEqual({ method: 'POST', path: 'followers', body: { userIds: ['u2'] } }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'إزالة سارة مجدي من المتابعين' }));
    await waitFor(() => expect(calls).toContainEqual({ method: 'DELETE', path: 'u1', body: null }));
  });
});
