import { CorePermission as P, type TaskAbilitiesDto, type TaskDto, type TaskFileDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { taskDetail } from '../../../../test/task-fixtures';
import { TaskFilesSection } from './task-files-section';

const PDF = 'application/pdf';
const file = (id: string, name: string, kind: TaskFileDto['kind'], canRemove = false): TaskFileDto => ({ id, name, size: 10, contentType: PDF, kind, addedBy: { id: 'u2', name: 'منى خالد' }, addedAt: '2026-11-10T09:30:00.000Z', canRemove });
const abilities = (over: Partial<TaskAbilitiesDto>): TaskAbilitiesDto => ({ ...taskDetail().abilities, ...over });
const grants = [P.TasksFileAdd, P.TasksFileDeliver, P.TasksFileRemove].map((key) => ({ key, scope: 'all' as const }));

function serve(removed: string[] = []) {
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(grants))),
    http.delete('*/api/tasks/:id/files/:fileId', ({ params }) => { removed.push(String(params.fileId)); return HttpResponse.json(taskDetail()); }),
  );
  return removed;
}

const show = (task: TaskDto) => renderPage(<TaskFilesSection task={task} />);

describe('The files of a task: work files and delivery files (FR-212, FR-213, FR-214)', () => {
  it('lists the work files and the delivery files apart, each with its viewer link and who handed it in', async () => {
    serve();
    show(taskDetail({ files: [file('a', 'brief.pdf', 'reference'), file('b', 'result.pdf', 'delivery')] }));
    const work = await screen.findByTestId('task-files-reference');
    const delivery = screen.getByTestId('task-files-delivery');
    expect(within(work).getByRole('link', { name: /brief\.pdf/ })).toHaveAttribute('href', '/api/tasks/t1/files/a');
    expect(within(delivery).getByRole('link', { name: /result\.pdf/ })).toHaveAttribute('href', '/api/tasks/t1/files/b');
    expect(within(work).getByText('أضافه منى خالد · 2026-11-10 12:30')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /حذف/ })).not.toBeInTheDocument();
    expect(screen.queryByText('إضافة ملفات العمل')).not.toBeInTheDocument();
  });

  it('shows the add boxes only where the abilities say, and the delivery box for the doer', async () => {
    serve();
    show(taskDetail({ abilities: abilities({ addFiles: true, deliverFiles: true }) }));
    expect(await screen.findByRole('button', { name: 'إضافة ملفات العمل' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'تسليم ملفات' })).toBeDisabled();
  });

  it('renders nothing when there are no files and nothing may be added', () => {
    serve();
    show(taskDetail());
    expect(screen.queryByRole('heading', { name: 'الملفات' })).not.toBeInTheDocument();
  });

  it('removes a file after a confirmation, only when the API says it may be removed', async () => {
    const removed = serve();
    show(taskDetail({ files: [file('a', 'brief.pdf', 'reference', true), file('b', 'locked.pdf', 'reference', false)] }));
    expect(screen.queryByRole('button', { name: 'حذف locked.pdf' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'حذف brief.pdf' }));
    fireEvent.click(await screen.findByRole('button', { name: 'حذف' }));
    await waitFor(() => expect(removed).toEqual(['a']));
  });
});
