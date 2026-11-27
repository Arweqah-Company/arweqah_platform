import { CorePermission as P, type FileDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { createTaskHandler } from '../../../../test/task-fixtures';
import { NewTaskDialog } from './new-task-dialog';

const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const stored: FileDto = { id: 'f1', originalName: 'عرض.pptx', contentType: PPTX, size: 4, createdAt: '2026-12-01T10:00:00.000Z' };
const options = { assignees: [{ id: 'u1', name: 'سارة أحمد', isSelf: true }], tags: [], approver: null };

function serve(grants: { key: string; scope: 'all' }[]) {
  const posted: Record<string, unknown>[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me(grants))),
    http.get('*/api/tasks/options', () => HttpResponse.json(options)),
    http.post('*/api/files', () => HttpResponse.json(stored, { status: 201 })),
    createTaskHandler(posted),
  );
  return posted;
}

describe('Work files on a new task, with a look before sending (FR-212)', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:local');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  it('offers the box to a person who holds the key, lists the chosen file with a button to look at it, and sends its id with the task', async () => {
    const posted = serve([{ key: P.TasksCreate, scope: 'all' }, { key: P.TasksFileAdd, scope: 'all' }]);
    renderPage(<NewTaskDialog open onOpenChange={() => undefined} />);
    fireEvent.change(await screen.findByLabelText(/العنوان/), { target: { value: 'تجهيز العرض' } });
    fireEvent.change(await screen.findByLabelText('ملفات العمل'), { target: { files: [new File(['x'], 'عرض.pptx', { type: PPTX })] } });
    expect(await screen.findByRole('button', { name: 'معاينة عرض.pptx' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء المهمة' }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ title: 'تجهيز العرض', fileIds: ['f1'] });
  });

  it('shows no box to a person without the key, and sends no files', async () => {
    const posted = serve([{ key: P.TasksCreate, scope: 'all' }]);
    renderPage(<NewTaskDialog open onOpenChange={() => undefined} />);
    fireEvent.change(await screen.findByLabelText(/العنوان/), { target: { value: 'مهمة' } });
    expect(screen.queryByTestId('task-files-field')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء المهمة' }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]).toMatchObject({ fileIds: [] });
  });
});
