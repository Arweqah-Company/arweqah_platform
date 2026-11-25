import type { AgentDraftDto, AgentMessageDto } from '@arweqah-platform/shared';
import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactElement } from 'react';
import { me, server } from './msw';
import { renderPage } from './render';
import { useMe } from '../src/core/auth/session';
import { usePermissions } from '../src/core/permissions/can';
import { AgentChat } from '../src/features/agent-chat/agent-chat';

export const KEYS = ['agent.view', 'agent.use', 'agent.history_view'];
export const ATTACH_KEYS = [...KEYS, 'agent.attach_image'];
export const VOICE_KEYS = [...KEYS, 'agent.use_voice'];
export const grants = (keys: string[]) => keys.map((key) => ({ key, scope: 'all' as const }));
export const soon = () => new Date(Date.now() + 30 * 60_000).toISOString();

export const draft = (over: Partial<AgentDraftDto> = {}): AgentDraftDto => ({
  id: 'd1', operationId: 'TicketSetupController.createType', labelAr: 'إضافة نوع تذكرة', labelEn: 'Add a ticket type', summary: 'إضافة النوع «مشكلة تقنية» إلى قسم التقنية',
  values: {}, destructive: false, status: 'pending', expiresAt: soon(), result: null, files: [], ...over,
});
export const reply = (text: string, d: AgentDraftDto | null = null): AgentMessageDto => ({ id: 'm1', role: 'assistant', text, draft: d, links: null, form: null, files: [], createdAt: new Date().toISOString() });

/** The assistant's live answer: events written as the API writes them, delivered in two pieces cut in the middle of an event. */
export const live = (events: [string, unknown][], status = 200) => {
  const text = events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('');
  const bytes = new TextEncoder().encode(text);
  const cut = Math.floor(bytes.length / 2);
  const body = new ReadableStream({ start: (c) => { c.enqueue(bytes.slice(0, cut)); c.enqueue(bytes.slice(cut)); c.close(); } });
  return new HttpResponse(body, { status, headers: { 'content-type': 'text/event-stream' } });
};
export const answer = (conversationId: string, ...messages: AgentMessageDto[]) => live([['status', { code: 'thinking' }], ['reply', { conversationId, messages }]]);

export function open(keys = KEYS, wrap: (chat: ReactElement) => ReactElement = (chat) => chat) {
  const body = me(grants(keys), { without: ['agent.'] });
  server.use(http.get('*/api/me', () => HttpResponse.json(body)));
  renderPage(wrap(<AgentChat />));
}
export const launcher = () => screen.findByRole('button', { name: 'فتح مساعد المنصة' });
export const write = async (text: string) => {
  fireEvent.click(await launcher());
  fireEvent.change(await screen.findByLabelText('اكتب رسالتك'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
};


/** Shows a word once the session and the permissions are both applied: a test that expects something to be ABSENT waits for it first, so it cannot pass only because nothing has loaded yet. */
export function Ready() {
  const { data } = useMe();
  const { ready } = usePermissions();
  return data && ready ? <p>session-ready</p> : null;
}
export const withReady = (chat: ReactElement) => <><Ready />{chat}</>;
