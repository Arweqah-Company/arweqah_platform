import { CorePermission as P, type TaskAbilitiesDto, type TaskDto, type TaskFileDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { slowUploads } from '../../../../test/slow-upload';
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

  describe('adding files (review of PR 196)', () => {
    afterEach(() => vi.restoreAllMocks());
    const stored = (id: string) => ({ id, originalName: `${id}.pdf`, contentType: PDF, size: 4, createdAt: '2026-12-01T10:00:00.000Z' });
    const pick = async (name: string) => fireEvent.change(await screen.findByLabelText('إضافة ملفات العمل', { selector: 'input' }), { target: { files: [new File(['x'], `${name}.pdf`, { type: PDF })] } });

    it('keeps «add» off while a chosen file is still uploading', async () => {
      serve();
      const slow = slowUploads([stored('a')]);
      URL.createObjectURL = vi.fn(() => 'blob:x');
      show(taskDetail({ abilities: abilities({ addFiles: true }) }));
      await pick('a');
      await waitFor(() => expect(screen.getByRole('button', { name: 'إضافة ملفات العمل' })).toBeDisabled());
      slow.release();
      await screen.findByRole('button', { name: 'معاينة a.pdf' });
      await waitFor(() => expect(screen.getByRole('button', { name: 'إضافة ملفات العمل' })).toBeEnabled());
    });

    it('clears only the files the request carried: one chosen while it was in flight stays in the box', async () => {
      serve();
      slowUploads([stored('a'), stored('b')]).release();
      server.use(http.post('*/api/tasks/:id/files', async () => { await delay(150); return HttpResponse.json(taskDetail()); }));
      URL.createObjectURL = vi.fn(() => 'blob:x');
      show(taskDetail({ abilities: abilities({ addFiles: true }) }));
      await pick('a');
      await screen.findByRole('button', { name: 'معاينة a.pdf' });
      fireEvent.click(screen.getByRole('button', { name: 'إضافة ملفات العمل' }));
      await pick('b');
      await screen.findByRole('button', { name: 'معاينة b.pdf' });
      await waitFor(() => expect(screen.queryByRole('button', { name: 'معاينة a.pdf' })).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: 'معاينة b.pdf' })).toBeInTheDocument();
    });
  });
});
