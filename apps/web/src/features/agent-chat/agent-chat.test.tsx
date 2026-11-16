import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { me, server } from '../../../test/msw';
import { renderPage } from '../../../test/render';
import { AgentChat } from './agent-chat';
import { KEYS, answer, draft, grants, launcher, live, open, reply, write } from '../../../test/agent-chat-support';

describe('The platform assistant panel (FR-145)', () => {
  it('is not on the screen for a person without agent.view', async () => {
    open(['tickets.view']);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'فتح مساعد المنصة' })).not.toBeInTheDocument());
  });

  it('opens from the button in the corner, closes with Escape, and tells the person how to start', async () => {
    open();
    fireEvent.click(await launcher());
    expect(await screen.findByRole('dialog', { name: 'مساعد المنصة' })).toBeInTheDocument();
    expect(screen.getByText(/قل لي ما تريد فعله/)).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the employee\'s line and the assistant\'s question', async () => {
    server.use(http.post('*/api/agent/messages/stream', () => answer('c1', reply('ما الاسم الإنجليزي للنوع؟'))));
    open();
    await write('أضف نوع تذكرة');
    expect(await screen.findByText('أضف نوع تذكرة')).toBeInTheDocument();
    expect(await screen.findByText('ما الاسم الإنجليزي للنوع؟')).toBeInTheDocument();
  });

  it('sends the conversation id with the next message', async () => {
    const bodies: unknown[] = [];
    server.use(http.post('*/api/agent/messages/stream', async ({ request }) => { bodies.push(await request.json()); return answer('c1', reply('تمام')); }));
    open();
    await write('أولًا');
    await screen.findByText('تمام');
    fireEvent.change(screen.getByLabelText('اكتب رسالتك'), { target: { value: 'ثانيًا' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[0]).toEqual({ text: 'أولًا' });
    expect(bodies[1]).toEqual({ conversationId: 'c1', text: 'ثانيًا' });
  });

  it('FR-148: tells the API the language of the screen, since the browser\'s own language may be another', async () => {
    let language: string | null = null;
    server.use(http.post('*/api/agent/messages/stream', ({ request }) => { language = request.headers.get('x-ui-language'); return answer('c1', reply('تمام')); }));
    open();
    await write('مرحبًا');
    await screen.findByText('تمام');
    expect(language).toBe('ar');
  });

  it('FR-141: a draft shows what will be done; confirming runs it and shows the result', async () => {
    server.use(
      http.post('*/api/agent/messages/stream', () => answer('c1', reply('إضافة النوع', draft()))),
      http.post('*/api/agent/drafts/d1/confirm', () => HttpResponse.json({ conversationId: 'c1', messages: [{ ...reply('إضافة النوع', draft({ status: 'confirmed', result: { ok: true, status: 201, message: '' } })), id: 'm1' }, { ...reply('تم: إضافة نوع تذكرة.'), id: 'm2' }] }, { status: 201 })),
    );
    open();
    await write('أضف نوعًا');
    expect(await screen.findByText('إضافة النوع «مشكلة تقنية» إلى قسم التقنية')).toBeInTheDocument();
    expect(screen.getByText('بانتظارك')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    expect(await screen.findByText('تم: إضافة نوع تذكرة.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تأكيد' })).not.toBeInTheDocument();
  });

  it('FR-141: cancelling a draft takes its buttons away', async () => {
    server.use(
      http.post('*/api/agent/messages/stream', () => answer('c1', reply('إضافة النوع', draft()))),
      http.post('*/api/agent/drafts/d1/cancel', () => HttpResponse.json({ ...reply('إضافة النوع', draft({ status: 'cancelled' })) }, { status: 201 })),
    );
    open();
    await write('أضف نوعًا');
    fireEvent.click(await screen.findByRole('button', { name: 'إلغاء' }));
    expect(await screen.findByText('أُلغي')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'تأكيد' })).not.toBeInTheDocument();
  });

  it('FR-141: a delete is marked in red with a warning, and an expired draft cannot be confirmed', async () => {
    const pastDraft = draft({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
    server.use(http.post('*/api/agent/messages/stream', () => answer('c1', reply('حذف', draft({ destructive: true })), { ...reply('قديم', pastDraft), id: 'm2' })));
    open();
    await write('احذف');
    expect(await screen.findByText('هذا الطلب يحذف شيئًا. راجع الاسم قبل أن تؤكد.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'تأكيد' })).toHaveLength(1);
    expect(screen.getByText('انتهت مدته')).toBeInTheDocument();
  });

  it('FR-149: while the assistant works the panel says what it is doing and shows the words as they are written, then the final message replaces them', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(http.post('*/api/agent/messages/stream', () => {
      const encoder = new TextEncoder();
      const event = (name: string, data: unknown) => encoder.encode(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
      return new HttpResponse(new ReadableStream({ async start(c) {
        c.enqueue(event('status', { code: 'lookup', label: 'قائمة الأقسام' }));
        c.enqueue(event('text', { delta: 'تحتاج أولًا ' }));
        await gate;
        c.enqueue(event('reply', { conversationId: 'c1', messages: [reply('تحتاج أولًا صلاحية.')] }));
        c.close();
      } }), { headers: { 'content-type': 'text/event-stream' } });
    }));
    open();
    await write('كيف أضيف نوعًا؟');
    expect(await screen.findByText('يبحث عن: قائمة الأقسام…')).toBeInTheDocument();
    expect(await screen.findByText('تحتاج أولًا')).toBeInTheDocument();
    release();
    expect(await screen.findByText('تحتاج أولًا صلاحية.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('يبحث عن: قائمة الأقسام…')).not.toBeInTheDocument());
    expect(screen.queryByText('تحتاج أولًا')).not.toBeInTheDocument();
  });

  it('FR-150: switched off by the administrator, the button is not on the screen at all', async () => {
    const body = { ...me(grants(KEYS)), agentEnabled: false };
    server.use(http.get('*/api/me', () => HttpResponse.json(body)));
    renderPage(<AgentChat />);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'فتح مساعد المنصة' })).not.toBeInTheDocument());
  });

  it('FR-144: a refusal (too many messages) is explained in words under the conversation', async () => {
    server.use(http.post('*/api/agent/messages/stream', () => live([['error', { status: 422, code: 'AGENT_RATE_LIMITED', message: 'Too many messages this hour, try again later' }]])));
    open();
    await write('مرحبًا');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('FR-142: earlier conversations are listed and one can be opened', async () => {
    server.use(
      http.get('*/api/agent/conversations', () => HttpResponse.json([{ id: 'c9', title: 'نوع تذكرة جديد', updatedAt: new Date().toISOString() }])),
      http.get('*/api/agent/conversations/c9', () => HttpResponse.json({ id: 'c9', title: 'نوع تذكرة جديد', updatedAt: new Date().toISOString(), messages: [{ ...reply('رد قديم'), id: 'o1' }] })),
    );
    open();
    fireEvent.click(await launcher());
    fireEvent.click(await screen.findByRole('button', { name: 'المحادثات السابقة' }));
    fireEvent.click(await screen.findByText('نوع تذكرة جديد'));
    expect(await screen.findByText('رد قديم')).toBeInTheDocument();
  });

  it('hides the history button without agent.history_view and the box without agent.use', async () => {
    open(['agent.view']);
    fireEvent.click(await launcher());
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: 'المحادثات السابقة' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('اكتب رسالتك')).not.toBeInTheDocument();
    expect(screen.getByText(/لا يمكنك الكتابة إلى المساعد/)).toBeInTheDocument();
  });
});
