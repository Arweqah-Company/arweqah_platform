import { defaultCommentMatrix, type TaskCommentDto, type TaskConversationDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../../test/msw';
import { renderPage } from '../../../../test/render';
import { Conversation } from './conversation';

const SARA = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const comment = (over: Partial<TaskCommentDto> = {}): TaskCommentDto => ({
  id: 'c1', parentId: null, author: { id: 'u2', name: 'منى خالد' }, replyTo: null, body: 'مرحبا', mentions: [], files: [], createdAt: '2026-10-28T10:00:00.000Z',
  isEdited: false, isDeleted: false, mayEdit: false, mayDelete: false, ...over,
});
const conversation = (over: Partial<TaskConversationDto> = {}): TaskConversationDto => ({
  task: { id: 't1', number: 'TSK-000001', title: 'إعداد التقرير' }, comments: [], can: { write: true, reply: true, upload: true, mention: true }, maxFiles: 5, locked: false, isOutsider: false, ...over,
});

function serve(first: TaskConversationDto) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  server.use(
    http.get('*/api/me', () => HttpResponse.json(me())),
    http.get('*/api/tasks/t1/comments/mentionables', ({ request }) => {
      const search = new URL(request.url).searchParams.get('search') ?? '';
      return HttpResponse.json([{ id: SARA, name: 'سارة أحمد' }, { id: 'p2', name: 'سامي علي' }].filter((p) => p.name.includes(search)));
    }),
    http.get('*/api/tasks/t1/comments', () => HttpResponse.json(first)),
    http.post('*/api/tasks/t1/comments', async ({ request }) => {
      calls.push({ method: 'POST', path: 'comments', body: await request.json() });
      return HttpResponse.json(conversation({ comments: [comment({ id: 'new', body: 'تم' })] }));
    }),
    http.post('*/api/tasks/t1/comments/:id/replies', async ({ request, params }) => {
      calls.push({ method: 'POST', path: `replies:${String(params.id)}`, body: await request.json() });
      return HttpResponse.json(first);
    }),
    http.delete('*/api/tasks/t1/comments/:id', ({ params }) => {
      calls.push({ method: 'DELETE', path: String(params.id), body: null });
      return HttpResponse.json(conversation({ comments: [comment({ id: String(params.id), isDeleted: true, body: '' })] }));
    }),
  );
  return calls;
}
const open = () => renderPage(<Conversation taskId="t1" />);

describe('Task conversation (FR-66)', () => {
  it('shows the comments with answers under them, mention chips, files, edited and deleted marks', async () => {
    serve(conversation({
      comments: [
        comment({ id: 'c1', body: `انتبه {{mention:${SARA}}}`, mentions: [{ id: SARA, name: 'سارة أحمد' }], files: [{ id: 'f1', name: 'screen.png', size: 10, contentType: 'image/png' }], isEdited: true }),
        comment({ id: 'c2', parentId: 'c1', body: 'تمام', replyTo: { id: 'u2', name: 'منى خالد' }, author: { id: 'u3', name: 'علي حسن' } }),
        comment({ id: 'c3', isDeleted: true, body: '' }),
      ],
    }));
    open();
    expect(await screen.findByText('@سارة أحمد')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /screen\.png/ })).toHaveAttribute('href', '/api/tasks/t1/comments/c1/files/f1');
    expect(screen.getByText('· معدّل')).toBeInTheDocument();
    expect(screen.getByText('ردًا على منى خالد')).toBeInTheDocument();
    expect(screen.getByText('حُذف هذا التعليق')).toBeInTheDocument();
    expect(screen.getByText('علي حسن').closest('ul')).toHaveClass('border-s-2');
  });

  it('sends a comment, turning a name picked after @ into a mention', async () => {
    const calls = serve(conversation());
    open();
    const box = await screen.findByRole('textbox', { name: 'اكتب تعليقًا' });
    fireEvent.change(box, { target: { value: 'مرحبا @سا', selectionStart: 9 } });
    fireEvent.keyUp(box, { target: { selectionStart: 9 } });
    const option = await screen.findByRole('option', { name: 'سارة أحمد' });
    fireEvent.mouseDown(option);
    await waitFor(() => expect(box).toHaveValue('مرحبا @سارة أحمد '));
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.body).toEqual({ body: `مرحبا {{mention:${SARA}}} `, fileIds: [] });
  });

  it('keeps send off while the box is empty and sends with Ctrl+Enter', async () => {
    const calls = serve(conversation());
    open();
    const box = await screen.findByRole('textbox', { name: 'اكتب تعليقًا' });
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeDisabled();
    fireEvent.change(box, { target: { value: 'تم' } });
    fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(calls[0]?.body).toEqual({ body: 'تم', fileIds: [] }));
  });

  it('answers a comment in a box under it', async () => {
    const calls = serve(conversation({ comments: [comment({ id: 'c1' })] }));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'رد' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'اكتب ردًا على منى خالد' }), { target: { value: 'جواب' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'إرسال' }).find((b) => !(b as HTMLButtonElement).disabled) as HTMLElement);
    await waitFor(() => expect(calls.some((c) => c.path === 'replies:c1')).toBe(true));
  });

  it('deletes one\'s own comment after a confirmation, and offers delete only where the API allows it', async () => {
    const calls = serve(conversation({ comments: [comment({ id: 'c1', mayDelete: true }), comment({ id: 'c2', body: 'غيري' })] }));
    open();
    await screen.findByText('غيري');
    expect(screen.getAllByRole('button', { name: 'حذف' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    fireEvent.click(await screen.findByRole('button', { name: 'حذف', hidden: false }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === 'c1')).toBe(true));
  });

  it('shows why there is no box: closed, read-only, or outside the task', async () => {
    serve(conversation({ locked: true, isOutsider: true, can: { write: false, reply: false, upload: false, mention: false } }));
    open();
    expect(await screen.findByText('أُغلقت محادثة هذه المهمة: يمكنك القراءة فقط.')).toBeInTheDocument();
    expect(screen.getByText('ترى رقم المهمة وعنوانها ومحادثتها فقط.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows the API\'s refusal in words when the person may not read the conversation', async () => {
    server.use(http.get('*/api/me', () => HttpResponse.json(me())), http.get('*/api/tasks/t1/comments', () => HttpResponse.json({ code: 'NOT_FOUND', message: 'Task was not found' }, { status: 404 })));
    open();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('has a default matrix with all eight relations and seven actions (the shape the rules page edits)', () => {
    expect(Object.keys(defaultCommentMatrix())).toHaveLength(8);
  });
});
