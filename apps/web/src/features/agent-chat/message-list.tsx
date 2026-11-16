import type { AgentMessageDto, AgentStatusDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { DraftCard } from './draft-card';
import { FormCard, FormSent } from './form-card';
import { MessageLinks } from './message-links';

interface Props {
  messages: AgentMessageDto[];
  busy: boolean;
  /** While a message is being worked on: what the assistant is doing and the words it has written so far. */
  live?: { status: AgentStatusDto | null; text: string } | null;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onSendForm: (id: string, values: Record<string, unknown>) => void;
  formError: unknown;
  onNavigate: () => void;
}

/** The conversation: the employee's lines on the end side in petrol tint, the assistant's on the start side; a live region so a screen reader hears the answer. */
export function MessageList({ messages, live, ...rest }: Props) {
  const { t } = useTranslation('agentChat');
  const { busy } = rest;
  return (
    <div role="log" aria-live="polite" aria-label={t('conversation')} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.length === 0 && <p className="text-sm text-muted">{t('empty')}</p>}
      {messages.map((message) => (
        <div key={message.id} className={cn('flex max-w-[92%] flex-col', message.role === 'user' ? 'self-end items-end' : 'self-start items-start')}>
          <p className={cn('whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm', message.role === 'user' ? 'bg-petrol-50 text-fg' : 'bg-neutral-50 text-fg')}>{message.text}</p>
          <Attachments message={message} {...rest} />
        </div>
      ))}
      {live?.text && <p className="max-w-[92%] self-start whitespace-pre-wrap rounded-2xl bg-neutral-50 px-3 py-2 text-sm text-fg">{live.text}</p>}
      {busy && <p role="status" className="text-sm text-muted">{live?.status ? t(`status.${live.status.code}`, { label: 'label' in live.status ? live.status.label : '' }) : t('thinking')}</p>}
    </div>
  );
}

type AttachmentProps = Omit<Props, 'messages' | 'live'> & { message: AgentMessageDto };

/** What hangs under an assistant's line: links to the manual and the page, the form it offers, the request waiting for confirmation. */
function Attachments({ message, busy, onConfirm, onCancel, onSendForm, formError, onNavigate }: AttachmentProps) {
  const { t } = useTranslation('agentChat');
  const [opened, setOpened] = useState(false);
  const { form, draft, links } = message;
  return (
    <>
      {links && links.length > 0 && <MessageLinks links={links} onNavigate={onNavigate} />}
      {form?.status === 'submitted' && <div className="mt-2"><FormSent /></div>}
      {form?.status === 'open' && (opened
        ? <FormCard form={form} busy={busy} error={formError} onSubmit={(values) => onSendForm(message.id, values)} />
        : <Button className="mt-2" size="sm" variant="secondary" onClick={() => setOpened(true)}>{t('form.open')}</Button>)}
      {draft && <DraftCard draft={draft} busy={busy} onConfirm={() => onConfirm(draft.id)} onCancel={() => onCancel(draft.id)} />}
    </>
  );
}
