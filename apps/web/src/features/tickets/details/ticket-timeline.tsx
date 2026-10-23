import type { TicketDto, TicketEventDto } from '@arweqah-platform/shared';
import { Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';

const QUIET = new Set<TicketEventDto['type']>(['created', 'reply']);

function Attachments({ ticketId, event }: { ticketId: string; event: TicketEventDto }) {
  if (event.attachments.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {event.attachments.map((a) => (
        <li key={a.fileId}>
          <a href={`/api/tickets/${ticketId}/attachments/${a.fileId}`} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-3 py-1 text-xs text-link hover:underline">
            <Paperclip className="size-3.5" aria-hidden />
            <span dir="ltr">{a.originalName}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Entry({ ticketId, event }: { ticketId: string; event: TicketEventDto }) {
  const { t, i18n } = useTranslation('tickets');
  const reply = QUIET.has(event.type);
  return (
    <li className={cn('rounded-2xl border p-4', reply ? 'border-neutral-200 bg-white' : 'border-petrol-50 bg-petrol-50')}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="font-medium text-fg">{event.actor?.name ?? t('timeline.system')} <span className="font-normal text-muted">· {t(`events.${event.type}`)}</span></span>
        <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString(i18n.language)}</time>
      </div>
      {event.body && <p className="mt-2 whitespace-pre-wrap text-sm">{event.body}</p>}
      <Attachments ticketId={ticketId} event={event} />
    </li>
  );
}

/** Replies and every change of the ticket, oldest first. */
export function TicketTimeline({ ticket }: { ticket: TicketDto }) {
  const { t } = useTranslation('tickets');
  return (
    <section aria-label={t('timeline.label')}>
      <ol className="flex flex-col gap-3">{ticket.events.map((e) => <Entry key={e.id} ticketId={ticket.id} event={e} />)}</ol>
    </section>
  );
}
