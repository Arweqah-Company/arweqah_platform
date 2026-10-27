import { CorePermission as P } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage, renderRoute } from '../../../../test/render';
import { taskItem, taskPage } from '../../../../test/task-fixtures';
import { MyTasksPage } from './my-tasks-page';
import { chooseOption } from '../../../../test/select';

const options = { assignees: [{ id: 'u1', name: 'سارة أحمد', isSelf: true }], tags: [], approver: null };

/** Serves the page and records the queries it sends. */
function serve(items = [taskItem(), taskItem({ id: 't2', number: 'TSK-000002', title: 'مراجعة العقد', status: 'in_progress', priority: 'high', flags: { urgent: true, overdue: true, stale: false, objected: false } })], keys: string[] = [P.TasksView, P.TasksCreate]) {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(keys.map((key) => ({ key, scope: 'own' as const }))))),
    http.get('*/api/tasks/options', () => HttpResponse.json(options)),
    http.get('*/api/tasks', ({ request }) => {
      queries.push(new URL(request.url).searchParams);
      return HttpResponse.json(taskPage(items));
    }),
  );
  return queries;
}

describe('My tasks page (FR-48, FR-50)', () => {
  it('opens on the open tasks of the "assigned to me" tab, ordered by due date, with the marks of each task', async () => {
    const queries = serve();
    renderPage(<MyTasksPage />);
    expect(await screen.findByText('إعداد تقرير المبيعات')).toBeInTheDocument();
    expect(screen.getByText('مراجعة العقد')).toBeInTheDocument();
    expect(screen.getByText('عاجلة')).toBeInTheDocument();
    expect(screen.getByText('متأخرة')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'المسندة لي', selected: true })).toBeInTheDocument();
    const first = queries[0];
    expect(first?.get('tab')).toBe('assigned');
    expect(first?.get('openOnly')).toBe('true');
    expect(first?.get('sort')).toBe('dueDate');
    expect(first?.get('dir')).toBe('asc');
  });

  it('changes the tab and goes back to the first page', async () => {
    const queries = serve();
    renderPage(<MyTasksPage />);
    await screen.findByText('إعداد تقرير المبيعات');
    fireEvent.click(screen.getByRole('tab', { name: 'المسندة مني' }));
    await waitFor(() => expect(queries.at(-1)?.get('tab')).toBe('created'));
    fireEvent.click(screen.getByRole('tab', { name: 'المتابَعة' }));
    await waitFor(() => expect(queries.at(-1)?.get('tab')).toBe('following'));
    expect(queries.at(-1)?.get('page')).toBe('1');
  });

  it('sorts by a header: first ascending, then descending, and says which way in the header', async () => {
    const queries = serve();
    renderPage(<MyTasksPage />);
    await screen.findByText('إعداد تقرير المبيعات');
    const title = screen.getByRole('button', { name: 'العنوان' });
    fireEvent.click(title);
    await waitFor(() => expect(queries.at(-1)?.get('sort')).toBe('title'));
    expect(queries.at(-1)?.get('dir')).toBe('asc');
    expect(screen.getByRole('columnheader', { name: 'العنوان' })).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(screen.getByRole('button', { name: 'العنوان' }));
    await waitFor(() => expect(queries.at(-1)?.get('dir')).toBe('desc'));
    expect(screen.getByRole('columnheader', { name: 'العنوان' })).toHaveAttribute('aria-sort', 'descending');
  });

  it('shows the new-task button only to people who hold its key', async () => {
    serve([], [P.TasksView]);
    renderPage(<MyTasksPage />);
    await screen.findByText('لا شيء مطلوب منك');
    expect(screen.queryByRole('button', { name: /مهمة جديدة/ })).not.toBeInTheDocument();
  });

  it('offers the archive filter only with the archive key, and finished tasks only on request', async () => {
    const queries = serve([], [P.TasksView, P.TasksArchiveView]);
    renderPage(<MyTasksPage />);
    await screen.findByText('لا شيء مطلوب منك');
    fireEvent.click(screen.getByRole('button', { name: /فلاتر|تصفية/ }));
    expect(await screen.findByLabelText('المؤرشفة')).toBeInTheDocument();
    expect(await screen.findByLabelText('تضمين المكتملة والمرفوضة')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('تضمين المكتملة والمرفوضة'));
    await waitFor(() => expect(queries.at(-1)?.has('openOnly')).toBe(false));
  });

  it('shows an explanatory empty state, and another when a search finds nothing', async () => {
    serve([]);
    renderPage(<MyTasksPage />);
    expect(await screen.findByText('لا شيء مطلوب منك')).toBeInTheDocument();
  });

  it('switches to the Kanban board, which shows a column for every status, and remembers the choice', async () => {
    serve();
    renderPage(<MyTasksPage />);
    await screen.findByText('إعداد تقرير المبيعات');
    fireEvent.click(screen.getByRole('button', { name: 'لوحة كانبان' }));
    for (const column of ['بانتظار الاعتماد', 'للتنفيذ', 'قيد التنفيذ', 'بانتظار المراجعة', 'مكتملة', 'مرفوضة']) {
      expect(await screen.findByRole('region', { name: column })).toBeInTheDocument();
    }
    expect(window.localStorage.getItem('view:tasks-mode')).toBe('board');
  });
});

describe('A new task opens in a popup over the list (FR-48)', () => {
  it('opens the popup from the button, with the form inside it and no other page', async () => {
    serve();
    renderPage(<MyTasksPage />);
    fireEvent.click(await screen.findByRole('button', { name: /مهمة جديدة/ }));
    const dialog = await screen.findByRole('dialog', { name: 'مهمة جديدة' });
    expect(dialog.querySelector('input[aria-required]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'مهامي', hidden: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens it at once when a link asks for it (the home page\'s empty state)', async () => {
    serve();
    renderRoute([{ path: '/tasks', element: <MyTasksPage /> }], '/tasks?new=1');
    expect(await screen.findByRole('dialog', { name: 'مهمة جديدة' })).toBeInTheDocument();
  });
});

describe('My team is a tab of my tasks (FR-49)', () => {
  const asManager = (scope: 'own' | 'subtree', hidden: string[] = []) => {
    const team: URLSearchParams[] = [];
    server.use(
      http.get('*/api/me', () => HttpResponse.json({ ...me([{ key: P.TasksView, scope: 'own' }, { key: P.TasksTeamView, scope }]), hiddenPages: hidden })),
      http.get('*/api/tasks/options', () => HttpResponse.json(options)),
      http.get('*/api/tasks/team', ({ request }) => {
        team.push(new URL(request.url).searchParams);
        return HttpResponse.json(taskPage([taskItem({ id: 't9', title: 'مهمة من الفريق', assignee: { id: 'u9', name: 'خالد علي' } })]));
      }),
      http.get('*/api/tasks', () => HttpResponse.json(taskPage([]))),
    );
    return team;
  };

  it('adds the team tab for a person whose team key reaches beyond themselves, and asks the team endpoint', async () => {
    const team = asManager('subtree');
    renderPage(<MyTasksPage />);
    fireEvent.click(await screen.findByRole('tab', { name: 'فريقي' }));
    expect(await screen.findByText('مهمة من الفريق')).toBeInTheDocument();
    expect(team[0]?.get('reach')).toBe('direct');
    await chooseOption(screen.getByLabelText('عرض', { exact: true }), 'all');
    await waitFor(() => expect(team.at(-1)?.get('reach')).toBe('all'));
  });

  it('offers no team tab with the own scope or when the team page is hidden from the person', async () => {
    asManager('own');
    const first = renderPage(<MyTasksPage />);
    await screen.findByRole('tab', { name: 'المسندة لي' });
    expect(screen.queryByRole('tab', { name: 'فريقي' })).not.toBeInTheDocument();
    first.unmount();
    asManager('subtree', ['tasks-team']);
    renderPage(<MyTasksPage />);
    await screen.findByRole('tab', { name: 'المسندة لي' });
    expect(screen.queryByRole('tab', { name: 'فريقي' })).not.toBeInTheDocument();
  });
});
