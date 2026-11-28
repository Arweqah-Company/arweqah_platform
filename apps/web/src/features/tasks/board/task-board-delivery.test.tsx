import { CorePermission as P, type FileDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { chooseOption } from '../../../../test/select';
import { renderPage } from '../../../../test/render';
import { slowUploads } from '../../../../test/slow-upload';
import { taskDetail, taskItem } from '../../../../test/task-fixtures';
import { Can } from '@/core/permissions/can';
import { TaskBoard } from './task-board';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const stored: FileDto = { id: 'f1', originalName: 'الأرقام.xlsx', contentType: XLSX, size: 4, createdAt: '2026-12-01T10:00:00.000Z' };
const progress = taskItem({ id: 't2', title: 'مهمة جارية', status: 'in_progress', revision: 3 });
const lanes = [{ id: 'all', tasks: [progress, taskItem({ id: 't1', title: 'للتنفيذ', status: 'todo' })] }];

function serve(holdsKey: boolean) {
  const calls: Record<string, unknown>[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(holdsKey ? [{ key: P.TasksFileDeliver, scope: 'all' }] : [], { without: holdsKey ? [] : [P.TasksFileDeliver] }))),
    http.post('*/api/files', () => HttpResponse.json(stored, { status: 201 })),
    http.post('*/api/tasks/:id/transition', async ({ request }) => {
      calls.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(taskDetail({ id: 't2', status: 'done' }));
    }),
  );
  return calls;
}

/** The board next to a marker that appears once the person's keys are loaded (a drag made before that finds no key). */
const board = () => renderPage(<><Can permission={P.TasksFileDeliver}><span>keys-ready</span></Can><TaskBoard lanes={lanes} today="2026-11-01" /></>);

describe('Handing in a delivery file with the move that finishes the work (FR-213)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:local');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('asks for the files before finishing a task in progress, and sends their ids with the move', async () => {
    const calls = serve(true);
    board();
    await screen.findByText('keys-ready');
    await chooseOption(await screen.findByLabelText(/انقل المهمة مهمة جارية إلى/), 'done');
    fireEvent.change(await screen.findByLabelText('ملفات التسليم'), { target: { files: [new File(['x'], 'الأرقام.xlsx', { type: XLSX })] } });
    expect(await screen.findByRole('button', { name: 'معاينة الأرقام.xlsx' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'انقل مع الملفات' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ to: 'done', revision: 3, fileIds: ['f1'] });
  });

  it('lets the person move the task with no files', async () => {
    const calls = serve(true);
    board();
    await screen.findByText('keys-ready');
    await chooseOption(await screen.findByLabelText(/انقل المهمة مهمة جارية إلى/), 'done');
    fireEvent.click(await screen.findByRole('button', { name: 'انقل بلا ملفات' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({ to: 'done', revision: 3 });
  });

  it('does not ask without the key (the Employee role holds it by default, so it is taken away here), nor when a task is only started', async () => {
    const calls = serve(false);
    renderPage(<><Can permission={P.TasksFileAdd}><span>keys-ready</span></Can><TaskBoard lanes={lanes} today="2026-11-01" /></>);
    await screen.findByText('keys-ready');
    await chooseOption(await screen.findByLabelText(/انقل المهمة مهمة جارية إلى/), 'done');
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps «move with the files» and «move without files» off while a file is still uploading (review of PR 196)', async () => {
    const calls = serve(true);
    const slow = slowUploads([stored]);
    board();
    await screen.findByText('keys-ready');
    await chooseOption(await screen.findByLabelText(/انقل المهمة مهمة جارية إلى/), 'done');
    fireEvent.change(await screen.findByLabelText('ملفات التسليم'), { target: { files: [new File(['x'], 'الأرقام.xlsx', { type: XLSX })] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'انقل بلا ملفات' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'انقل مع الملفات' })).toBeDisabled();
    expect(calls).toHaveLength(0);
    slow.release();
    await screen.findByRole('button', { name: 'معاينة الأرقام.xlsx' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'انقل مع الملفات' })).toBeEnabled());
  });

  it('locks the file box while the move is on its way, and opens it again when the move is refused (review of PR 196)', async () => {
    serve(true);
    let answer = 200;
    server.use(http.post('*/api/tasks/:id/transition', async () => { await delay(150); return answer === 200 ? HttpResponse.json(taskDetail({ id: 't2', status: 'done' })) : HttpResponse.json({ code: 'TASK_TRANSITION_NOT_ALLOWED', message: 'no' }, { status: 422 }); }));
    answer = 422;
    board();
    await screen.findByText('keys-ready');
    await chooseOption(await screen.findByLabelText(/انقل المهمة مهمة جارية إلى/), 'done');
    const box = await screen.findByLabelText('ملفات التسليم');
    fireEvent.click(screen.getByRole('button', { name: 'انقل بلا ملفات' }));
    await waitFor(() => expect(box).toBeDisabled());
    await waitFor(() => expect(box).toBeEnabled());
  });
});
