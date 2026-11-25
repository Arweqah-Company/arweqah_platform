import type { AgentMessageDto, AgentStatusDto } from '@arweqah-platform/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { ChatFile } from './chat-file';
import { fetchConversation, sendLive, useCancelDraft, useConfirmDraft, useSubmitForm } from './api';

/** A step whose failure is shown under the messages (from the mutation's error), not thrown. */
function quietly<A extends unknown[]>(step: (...args: A) => Promise<unknown>): (...args: A) => Promise<void> {
  return async (...args) => {
    try {
      await step(...args);
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

type SetMessages = Dispatch<SetStateAction<AgentMessageDto[]>>;

/**
 * What confirming, cancelling and sending a form do to the messages. Each one remembers which conversation it started in
 * (`generation`): an answer that comes back after the person opened another conversation or began a new one is dropped.
 */
function useDraftActions(generation: { current: number }, setMessages: SetMessages) {
  const confirm = useConfirmDraft();
  const cancel = useCancelDraft();
  const submit = useSubmitForm();
  const replace = (updated: AgentMessageDto) => setMessages((all) => all.map((m) => (m.id === updated.id ? updated : m)));
  const whileHere = async <T,>(work: Promise<T>, apply: (value: T) => void): Promise<void> => {
    const started = generation.current;
    const value = await work;
    if (started === generation.current) apply(value);
  };

  const confirmDraft = quietly((id: string, fileIds: string[]) => whileHere(confirm.mutateAsync({ id, fileIds }), ({ messages }) => {
    const [draft, outcome] = messages;
    if (draft) replace(draft);
    if (outcome) setMessages((all) => [...all, outcome]);
  }));
  /** Sends the form: it becomes «sent» and the confirmation card it made comes after it; the mistakes are shown on the form. */
  const sendForm = quietly((id: string, values: Record<string, unknown>) => whileHere(submit.mutateAsync({ id, values }), ({ messages }) => {
    const [form, draft] = messages;
    if (form) replace(form);
    if (draft) setMessages((all) => [...all, draft]);
  }));
  const cancelDraft = quietly((id: string) => whileHere(cancel.mutateAsync(id), replace));
  const reset = () => { confirm.reset(); cancel.reset(); submit.reset(); };
  return { confirmDraft, cancelDraft, sendForm, reset, formError: submit.error, error: confirm.error ?? cancel.error, pending: confirm.isPending || cancel.isPending || submit.isPending };
}

/** The open conversation: its messages, and what asking, confirming and cancelling do to them. The API decides everything; this only keeps what it answered. */
export function useChat() {
  const client = useQueryClient();
  const generation = useRef(0);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AgentMessageDto[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [sendError, setSendError] = useState<unknown>(null);
  const drafts = useDraftActions(generation, setMessages);
  const localId = useRef(0);
  /** Counts the requests to open an earlier conversation: only the latest one may change the screen. */
  const opening = useRef(0);

  /** The local previews of the pictures sent in this conversation; released when it is left. */
  const previews = useRef<string[]>([]);
  const releasePreviews = () => {
    previews.current.forEach((url) => URL.revokeObjectURL(url));
    previews.current = [];
  };
  useEffect(() => releasePreviews, []);

  const ask = async (text: string, files: ChatFile[] = []): Promise<void> => {
    const started = generation.current;
    const here = () => started === generation.current;
    const id = `local-${(localId.current += 1)}`;
    setSendError(null);
    previews.current.push(...files.flatMap((f) => f.localUrl ?? []));
    setMessages((all) => [...all, { id, role: 'user', text, draft: null, links: null, form: null, files, createdAt: new Date().toISOString() }]);
    setLive({ status: { code: 'thinking' }, text: '' });
    try {
      const reply = await sendLive({ conversationId, text, fileIds: files.map((f) => f.id) }, { onStatus: (status) => here() && setLive((l) => ({ text: l?.text ?? '', status })), onText: (delta) => here() && setLive((l) => ({ status: l?.status ?? null, text: (l?.text ?? '') + delta })) });
      if (!here()) return;
      setConversationId(reply.conversationId);
      setMessages((all) => [...all, ...reply.messages]);
      void client.invalidateQueries({ queryKey: ['agent-conversations'] });
    } catch (error) {
      // The request was not accepted: its line is taken out, so a second try does not leave two copies of it.
      if (here()) { setMessages((all) => all.filter((m) => m.id !== id)); setSendError(error); }
    } finally {
      if (here()) setLive(null);
    }
  };

  /** Opens an earlier conversation; false (and the error shown) when it could not be read. */
  const open = async (id: string): Promise<boolean> => {
    const token = (opening.current += 1);
    try {
      const detail = await fetchConversation(id);
      if (token !== opening.current) return false;
      generation.current += 1;
      releasePreviews();
      setConversationId(detail.id);
      setMessages(detail.messages);
      setLive(null);
      setSendError(null);
      drafts.reset();
      return true;
    } catch (error) {
      if (token === opening.current) setSendError(error);
      return false;
    }
  };

  const reset = (): void => {
    generation.current += 1;
    releasePreviews();
    opening.current += 1;
    setConversationId(undefined);
    setMessages([]);
    setLive(null);
    setSendError(null);
    drafts.reset();
  };

  const { confirmDraft, cancelDraft, sendForm, formError } = drafts;
  return { messages, live, ask, confirmDraft, cancelDraft, sendForm, formError, open, reset, busy: live !== null || drafts.pending, error: sendError ?? drafts.error };
}
