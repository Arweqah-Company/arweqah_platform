import type { AgentMessageDto, AgentStatusDto } from '@arweqah-platform/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchConversation, sendLive, useCancelDraft, useConfirmDraft, useSubmitForm } from './api';

/** A step whose failure is shown under the messages (from the mutation's error), not thrown. */
function quietly(step: (id: string) => Promise<unknown>): (id: string) => Promise<void> {
  return async (id) => {
    try {
      await step(id);
    } catch {
      /* shown under the messages */
    }
  };
}

/** What the screen shows while the assistant works: what it is doing and the words it has written so far. */
interface Live {
  status: AgentStatusDto | null;
  text: string;
}

/** The open conversation: its messages, and what asking, confirming and cancelling do to them. The API decides everything; this only keeps what it answered. */
export function useChat() {
  const client = useQueryClient();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AgentMessageDto[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [sendError, setSendError] = useState<unknown>(null);
  const confirm = useConfirmDraft();
  const cancel = useCancelDraft();
  const submit = useSubmitForm();

  const replace = (updated: AgentMessageDto) => setMessages((all) => all.map((m) => (m.id === updated.id ? updated : m)));

  const ask = async (text: string): Promise<void> => {
    setSendError(null);
    setMessages((all) => [...all, { id: `local-${all.length}`, role: 'user', text, draft: null, links: null, form: null, createdAt: new Date().toISOString() }]);
    setLive({ status: { code: 'thinking' }, text: '' });
    try {
      const reply = await sendLive({ conversationId, text }, { onStatus: (status) => setLive((l) => ({ text: l?.text ?? '', status })), onText: (delta) => setLive((l) => ({ status: l?.status ?? null, text: (l?.text ?? '') + delta })) });
      setConversationId(reply.conversationId);
      setMessages((all) => [...all, ...reply.messages]);
      void client.invalidateQueries({ queryKey: ['agent-conversations'] });
    } catch (error) {
      setSendError(error);
    } finally {
      setLive(null);
    }
  };

  const confirmDraft = quietly(async (id: string) => {
    const [draft, outcome] = (await confirm.mutateAsync(id)).messages;
    if (draft) replace(draft);
    if (outcome) setMessages((all) => [...all, outcome]);
  });

  /** Sends the form: it becomes «sent» and the confirmation card it made comes after it. */
  const sendForm = async (id: string, values: Record<string, unknown>): Promise<void> => {
    try {
      const [form, draft] = (await submit.mutateAsync({ id, values })).messages;
      if (form) replace(form);
      if (draft) setMessages((all) => [...all, draft]);
    } catch {
      /* the mistakes are shown on the form */
    }
  };

  const cancelDraft = quietly(async (id: string) => replace(await cancel.mutateAsync(id)));

  const open = async (id: string): Promise<void> => {
    const detail = await fetchConversation(id);
    setConversationId(detail.id);
    setMessages(detail.messages);
  };

  const reset = (): void => {
    setConversationId(undefined);
    setMessages([]);
    setSendError(null);
    confirm.reset();
    cancel.reset();
    submit.reset();
  };

  return { messages, live, ask, confirmDraft, cancelDraft, sendForm, formError: submit.error, open, reset, busy: live !== null || confirm.isPending || cancel.isPending || submit.isPending, error: sendError ?? confirm.error ?? cancel.error };
}
