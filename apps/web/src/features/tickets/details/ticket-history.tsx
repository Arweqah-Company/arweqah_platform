import { formatTicketNumber, type TicketDto, type TicketEventDto, type TicketEventType } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Badge, HistoryActor, HistorySection, HistoryWhen, MentionedText, type Column } from '@/shared/ui';
import { TicketFiles } from './ticket-files';

type EventTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const EVENT_TONE: Record<TicketEventType, EventTone> = {
  created: 'info',
  reply: 'neutral',
  close_requested: 'warning',
  close_declined: 'danger',
  confirmed: 'success',
  auto_closed: 'neutral',
  closed_not_executed: 'danger',
  reopened: 'info',
  reassigned: 'info',
};

/** What a step carries beyond its name: the message that came with it, the person a ticket was handed to, and its files. */
function Detail({ ticketId, event }: { ticketId: string; event: TicketEventDto }) {
  const { t } = useTranslation('tickets');
  const handedTo = event.type === 'reassigned' && event.replyTo ? t('events.reassignedTo', { name: event.replyTo.name }) : null;
  if (!handedTo && !event.body && event.attachments.length === 0) return <span className="text-muted">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {handedTo && <span>{handedTo}</span>}
      {event.body && <MentionedText body={event.body} people={event.mentions} />}
      <TicketFiles ticketId={ticketId} event={event} />
    </div>
  );
}

function useColumns(ticketId: string, events: TicketEventDto[]): Column<TicketEventDto>[] {
  const { t } = useTranslation('tickets');
  const number = new Map(events.map((e, i) => [e.id, i + 1]));
  return [
    { id: 'n', header: '#', cell: (e) => number.get(e.id), className: 'w-10 tabular-nums text-muted' },
    { id: 'when', header: t('history.when'), cell: (e) => <HistoryWhen at={e.createdAt} /> },
    { id: 'who', header: t('history.who'), cell: (e) => <HistoryActor name={e.actor?.name ?? null} systemLabel={t('timeline.system')} /> },
    { id: 'what', header: t('history.what'), cell: (e) => <Badge tone={EVENT_TONE[e.type]}>{t(`events.${e.type}`)}</Badge> },
    { id: 'detail', header: t('history.detail'), cell: (e) => <Detail ticketId={ticketId} event={e} /> },
  ];
}

/** Every step of the ticket that is not a reply (sent, close requested or declined, confirmed, closed, reopened, reassigned), oldest first, opened from a button as a table. */
export function TicketHistory({ ticket }: { ticket: TicketDto }) {
  const { t } = useTranslation('tickets');
  const steps = ticket.events.filter((e) => e.type !== 'reply');
  const columns = useColumns(ticket.id, steps);
  return <HistorySection title={t('timeline.label')} description={`${formatTicketNumber(ticket.number)} · ${ticket.title}`} countText={t('history.count', { count: steps.length })} openLabel={t('history.open')} rows={steps} rowKey={(e) => e.id} columns={columns} />;
}
