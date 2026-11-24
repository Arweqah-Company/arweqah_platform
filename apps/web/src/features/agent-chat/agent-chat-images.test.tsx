import type { FileDto } from '@arweqah-platform/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { ATTACH_KEYS, KEYS, answer, draft, launcher, open, reply, withReady } from '../../../test/agent-chat-support';
import { server } from '../../../test/msw';

const stored = (id: string, name = 'screen.png'): FileDto => ({ id, originalName: name, contentType: 'image/png', size: 100, createdAt: new Date().toISOString() });
const png = (name = 'screen.png', size = 100) => new File([new Uint8Array(size)], name, { type: 'image/png' });

/** The browser has no object URLs in jsdom. */
vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() }));

/** The upload answers with the next name of the list (the body of a multipart request is not read: jsdom files do not survive that); `names` fills as uploads arrive. */
const uploads = (...answers: string[]) => {
  const names: string[] = [];
  server.use(http.post('*/api/agent/files', () => {
    const name = answers[names.length] ?? `file${names.length + 1}.png`;
    names.push(name);
    return HttpResponse.json(stored(`f${names.length}`, name), { status: 201 });
  }));
  return names;
};

const openChat = async () => { fireEvent.click(await launcher()); return screen.findByLabelText('اكتب رسالتك'); };
const attachButton = () => screen.findByRole('button', { name: 'إرفاق صورة' });

describe('Pictures in the assistant chat (FR-180)', () => {
  it('FR-180: without agent.attach_image there is no paperclip, and a paste does nothing', async () => {
    const names = uploads();
    open(KEYS);
    const box = await openChat();
    expect(screen.queryByRole('button', { name: 'إرفاق صورة' })).not.toBeInTheDocument();
    fireEvent.paste(box, { clipboardData: { files: [png()] } });
    await new Promise((r) => setTimeout(r, 50));
    expect(names).toEqual([]);
  });

  it('FR-180: the paperclip opens the file box; a chosen picture is uploaded, shown small with the warning, and can be removed', async () => {
    const names = uploads('error.png');
    open(ATTACH_KEYS);
    await openChat();
    fireEvent.click(await attachButton());
    expect(screen.getByText(/لا ترفع بيانات حساسة/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('اختر الصور المراد إرفاقها'), { target: { files: [png('error.png')] } });
    const thumb = await screen.findByRole('img', { name: 'error.png' });
    expect(names).toHaveLength(1);
    expect(thumb).toHaveAttribute('src', 'blob:preview');
    fireEvent.click(screen.getByRole('button', { name: 'إزالة error.png' }));
    expect(screen.queryByRole('img', { name: 'error.png' })).not.toBeInTheDocument();
  });

  it('FR-180: a screenshot pasted into the box is uploaded; a drop works the same; a file that is not a picture is refused', async () => {
    const names = uploads('pasted.png', 'dropped.png');
    open(ATTACH_KEYS);
    const box = await openChat();
    fireEvent.paste(box, { clipboardData: { files: [png('pasted.png')] } });
    await screen.findByRole('img', { name: 'pasted.png' });
    fireEvent.drop(box, { dataTransfer: { files: [png('dropped.png')] } });
    await screen.findByRole('img', { name: 'dropped.png' });
    fireEvent.drop(box, { dataTransfer: { files: [new File(['x'], 'notes.pdf', { type: 'application/pdf' })] } });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(names).toHaveLength(2);
  });

  it('FR-180: a fourth picture is refused with the limit, and a picture over 5 MB is refused before it is uploaded', async () => {
    const names = uploads('a.png', 'b.png', 'c.png');
    open(ATTACH_KEYS);
    const box = await openChat();
    for (const name of ['a.png', 'b.png', 'c.png']) {
      fireEvent.paste(box, { clipboardData: { files: [png(name)] } });
      await screen.findByRole('img', { name });
    }
    fireEvent.paste(box, { clipboardData: { files: [png('d.png')] } });
    expect(await screen.findByText(/3/)).toBeInTheDocument();
    expect(names).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'إزالة a.png' }));
    fireEvent.paste(box, { clipboardData: { files: [png('big.png', 6 * 1024 * 1024)] } });
    await screen.findByRole('alert');
    expect(names).toHaveLength(3);
  });

  it('FR-180: a picture alone can be sent: the ids go with the message, the picture shows in the bubble, and the box is empty again', async () => {
    uploads('pasted.png');
    const bodies: unknown[] = [];
    server.use(http.post('*/api/agent/messages/stream', async ({ request }) => { bodies.push(await request.json()); return answer('c1', reply('أرى الخطأ')); }));
    open(ATTACH_KEYS);
    const box = await openChat();
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeDisabled();
    fireEvent.paste(box, { clipboardData: { files: [png('pasted.png')] } });
    await screen.findByRole('img', { name: 'pasted.png' });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await screen.findByText('أرى الخطأ');
    expect(bodies[0]).toEqual({ text: '', fileIds: ['f1'] });
    const log = screen.getByRole('log');
    expect(within(log).getByRole('img', { name: 'pasted.png' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إزالة pasted.png' })).not.toBeInTheDocument();
  });

  it('FR-180: a draft that takes files offers the pictures ticked; confirming sends the ticked ones, and a picture left unticked is not sent', async () => {
    const posted: unknown[] = [];
    server.use(
      http.post('*/api/agent/messages/stream', () => answer('c1', reply('جهزت التذكرة', draft({ files: [{ id: 'p1', name: 'one.png', contentType: 'image/png', size: 1 }, { id: 'p2', name: 'two.png', contentType: 'image/png', size: 1 }] })))),
      http.get('*/api/agent/files/:id/preview', () => new HttpResponse(new Uint8Array([1]), { headers: { 'content-type': 'image/png' } })),
      http.post('*/api/agent/drafts/d1/confirm', async ({ request }) => { posted.push(await request.json()); return HttpResponse.json({ conversationId: 'c1', messages: [reply('x', draft({ status: 'confirmed' })), { ...reply('تم'), id: 'm2' }] }, { status: 201 }); }),
    );
    open(KEYS, withReady);
    const box = await openChat();
    fireEvent.change(box, { target: { value: 'افتح تذكرة' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    const one = await screen.findByRole('checkbox', { name: 'إرفاق one.png بالطلب' });
    const two = screen.getByRole('checkbox', { name: 'إرفاق two.png بالطلب' });
    expect(one).toBeChecked();
    fireEvent.click(two);
    expect(two).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    await waitFor(() => expect(posted).toEqual([{ fileIds: ['p1'] }]));
  });

  it('FR-180: a card of an action that takes no files shows no pictures and confirms with none', async () => {
    const posted: unknown[] = [];
    server.use(
      http.post('*/api/agent/messages/stream', () => answer('c1', reply('جهزت', draft()))),
      http.post('*/api/agent/drafts/d1/confirm', async ({ request }) => { posted.push(await request.json()); return HttpResponse.json({ conversationId: 'c1', messages: [reply('x', draft({ status: 'confirmed' })), { ...reply('تم'), id: 'm2' }] }, { status: 201 }); }),
    );
    open(KEYS, withReady);
    fireEvent.change(await openChat(), { target: { value: 'أضف نوعًا' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: 'تأكيد' }));
    await waitFor(() => expect(posted).toEqual([{ fileIds: [] }]));
  });
});
