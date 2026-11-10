import { CorePermission, type TicketDto, type TicketEventDto } from '@arweqah-platform/shared';
import { MessageSquareReply } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/core/permissions/can';
import { cn } from '@/shared/lib/cn';
import { FileChip, MentionedText, RowAction } from '@/shared/ui';
import { ReplyBox } from './reply-box';

const QUIET = new Set<TicketEventDto['type']>(['created', 'reply']);

/** The files of one entry, each with its «View» button. */
export function TicketFiles({ ticketId, event }: { ticketId: string; event: TicketEventDto }) {
  if (event.attachments.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {event.attachments.map((a) => (
        <li key={a.fileId}><FileChip file={{ name: a.originalName, contentType: a.contentType, previewPath: `/tickets/${ticketId}/attachments/${a.fileId}/preview`, downloadUrl: `/api/tickets/${ticketId}/attachments/${a.fileId}` }} /></li>
      ))}
    </ul>
  );
}

interface EntryProps {
  ticketId: string;
  event: TicketEventDto;
  /** Show «Reply» on this entry (it is a reply, the ticket takes replies and the person holds the key). */
  canAnswer: boolean;
  onAnswer?: () => void;
  nested?: boolean;
}

function Entry({ ticketId, event, canAnswer, onAnswer, nested }: EntryProps) {
  const { t, i18n } = useTranslation('tickets');
  const reply = QUIET.has(event.type);
  return (
    <div id={`event-${event.id}`} className={cn('rounded-2xl border p-4', reply ? 'border-neutral-200 bg-white' : 'border-petrol-50 bg-petrol-50', nested && 'bg-neutral-50')}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="font-medium text-fg">{event.actor?.name ?? t('timeline.system')} <span className="font-normal text-muted">· {t(`events.${event.type}`)}{event.replyTo && ` · ${t('reply.inReplyTo', { name: event.replyTo.name })}`}</span></span>
        <span className="flex items-center gap-1">
          <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString(i18n.language)}</time>
          {canAnswer && onAnswer && <RowAction label={t('reply.answer')} icon={MessageSquareReply} onClick={onAnswer} />}
        </span>
      </div>
      {event.body && <div className="mt-2"><MentionedText body={event.body} people={event.mentions} /></div>}
      <TicketFiles ticketId={ticketId} event={event} />
    </div>
  );
}

/** Replies and every change of the ticket, oldest first; the answers to a reply sit under it. */
export function TicketTimeline({ ticket }: { ticket: TicketDto }) {
  const { t } = useTranslation('tickets');
  const mayAnswer = usePermissions().can(CorePermission.TicketsCommentReply) && ticket.abilities.reply;
  const [answering, setAnswering] = useState<string | null>(null);
  const answersOf = (id: string) => ticket.events.filter((e) => e.parentId === id);
  return (
    <section aria-label={t('timeline.label')} className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-muted">{t('timeline.heading')}</h2>
      <ol className="flex flex-col gap-3">
        {ticket.events.filter((e) => !e.parentId && e.type !== 'created').map((e) => (
          <li key={e.id} className="flex flex-col gap-2">
            <Entry ticketId={ticket.id} event={e} canAnswer={mayAnswer && e.type === 'reply'} onAnswer={() => setAnswering(e.id)} />
            {(answersOf(e.id).length > 0 || answering === e.id) && (
              <ol className="ms-6 flex flex-col gap-2 border-s-2 border-petrol-50 ps-3">
                {answersOf(e.id).map((a) => <li key={a.id}><Entry ticketId={ticket.id} event={a} nested canAnswer={mayAnswer} onAnswer={() => setAnswering(e.id)} /></li>)}
                {answering === e.id && <li><ReplyBox ticketId={ticket.id} answering={e} onDone={() => setAnswering(null)} /></li>}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
