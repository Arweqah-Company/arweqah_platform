import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../../test/msw';
import { answer, draft, launcher, open, reply, write } from '../../../test/agent-chat-support';

const conversation = (messages: unknown[]) => ({ id: 'c9', title: 'قديمة', updatedAt: new Date().toISOString(), messages });
const history = (detail: () => Response | Promise<Response>) => server.use(
  http.get('*/api/agent/conversations', () => HttpResponse.json([{ id: 'c9', title: 'قديمة', updatedAt: new Date().toISOString() }])),
  http.get('*/api/agent/conversations/c9', detail),
);
const openHistory = async () => {
  fireEvent.click(await launcher());
  fireEvent.click(await screen.findByRole('button', { name: 'المحادثات السابقة' }));
  fireEvent.click(await screen.findByText('قديمة'));
};

describe('The assistant panel after the review of the release (FR-145)', () => {
  it('an answer that comes back after a new chat was started is dropped, not added to the new chat', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.post('*/api/agent/messages/stream', async () => { await gate; return answer('c1', reply('جواب متأخر')); }));
    open();
    await write('سؤال قديم');
    fireEvent.click(await screen.findByRole('button', { name: 'محادثة جديدة' }));
    release();
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByText('جواب متأخر')).not.toBeInTheDocument();
    expect(screen.queryByText('سؤال قديم')).not.toBeInTheDocument();
  });

  it('a request the server refused takes its line out, so a second try leaves one copy of it', async () => {
    let calls = 0;
    server.use(http.post('*/api/agent/messages/stream', () => {
      calls += 1;
      return calls === 1 ? HttpResponse.json({ statusCode: 500, code: 'INTERNAL', message: 'down' }, { status: 500 }) : answer('c1', reply('وصلت'));
    }));
    open();
    await write('أضف نوعًا');
    await screen.findByRole('alert');
    expect(screen.queryByText('أضف نوعًا')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('اكتب رسالتك'), { target: { value: 'أضف نوعًا' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await screen.findByText('وصلت');
    expect(screen.getAllByText('أضف نوعًا')).toHaveLength(1);
  });

  it('an earlier conversation that cannot be read leaves the list open and says so', async () => {
    history(() => HttpResponse.json({ statusCode: 500, code: 'INTERNAL', message: 'down' }, { status: 500 }));
    open();
    await openHistory();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('قديمة')).toBeInTheDocument();
  });

  it('a person who may read but not use sees the card without its Confirm and Cancel buttons', async () => {
    history(() => HttpResponse.json(conversation([{ ...reply('جهّزت الطلب', draft()), id: 'o1' }])));
    open(['agent.view', 'agent.history_view']);
    await openHistory();
    expect(await screen.findByText('جهّزت الطلب')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تأكيد' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إلغاء' })).not.toBeInTheDocument();
  });

  it('a card that was waiting turns «expired» by itself when its time comes, and loses its buttons', async () => {
    const soonDraft = draft({ expiresAt: new Date(Date.now() + 1200).toISOString() });
    history(() => HttpResponse.json(conversation([{ ...reply('جهّزت الطلب', soonDraft), id: 'o1' }])));
    open();
    await openHistory();
    expect(await screen.findByRole('button', { name: 'تأكيد' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'تأكيد' })).not.toBeInTheDocument(), { timeout: 4000 });
  });

  it('opening the panel moves the focus into it, and closing gives it back to the button', async () => {
    open();
    const button = await launcher();
    fireEvent.click(button);
    const panel = await screen.findByRole('dialog');
    await waitFor(() => expect(panel).toHaveFocus());
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(button).toHaveFocus());
  });

  it('a card that has expired stops its timer instead of scheduling a new one forever', async () => {
    const soonDraft = draft({ expiresAt: new Date(Date.now() + 300).toISOString() });
    history(() => HttpResponse.json(conversation([{ ...reply('جهّزت الطلب', soonDraft), id: 'o1' }])));
    open();
    await openHistory();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'تأكيد' })).not.toBeInTheDocument(), { timeout: 4000 });
    const timers = vi.spyOn(globalThis, 'setTimeout');
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(timers.mock.calls.filter(([, delay]) => delay === 0)).toHaveLength(0);
    timers.mockRestore();
  });

  it('a failed confirm in one chat does not show its error in the earlier chat that is opened next', async () => {
    server.use(
      http.post('*/api/agent/messages/stream', () => answer('c1', reply('جهّزت الطلب', draft()))),
      http.post('*/api/agent/drafts/d1/confirm', () => HttpResponse.json({ statusCode: 500, code: 'INTERNAL', message: 'down' }, { status: 500 })),
    );
    history(() => HttpResponse.json(conversation([{ ...reply('رد قديم'), id: 'o1' }])));
    open();
    await write('أضف نوعًا');
    fireEvent.click(await screen.findByRole('button', { name: 'تأكيد' }));
    await screen.findByRole('alert');
    fireEvent.click(await screen.findByRole('button', { name: 'المحادثات السابقة' }));
    fireEvent.click(await screen.findByText('قديمة'));
    expect(await screen.findByText('رد قديم')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
