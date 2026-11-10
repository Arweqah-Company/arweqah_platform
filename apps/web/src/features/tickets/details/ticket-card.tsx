import { formatTicketNumber, type TicketDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { TicketFlags, TicketStatusBadge } from '../ticket-badges';
import { TicketFiles } from './ticket-timeline';

/** The ticket itself: bigger and bolder than the replies below it, with its number, state, text, files and facts. */
export function TicketCard({ ticket }: { ticket: TicketDto }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const opening = ticket.events.find((e) => e.type === 'created');
  const facts: [string, string][] = [
    [t('columns.desk'), ar ? ticket.deskNameAr : ticket.deskNameEn],
    [t('columns.type'), ar ? ticket.typeNameAr : ticket.typeNameEn],
    [t('columns.sender'), ticket.sender.name],
    [t('columns.assignee'), ticket.assignee?.name ?? '—'],
    [t('columns.neededBy'), ticket.neededBy],
    [t('details.sentOn'), new Date(ticket.createdAt).toLocaleDateString(i18n.language)],
  ];
  return (
    <section aria-label={t('card.label')} className="flex flex-col gap-5 rounded-[var(--radius-panel)] border-2 border-link/30 bg-white p-6 shadow-md shadow-ink/10 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <span dir="ltr" className="rounded-lg bg-petrol-50 px-3 py-1 text-base font-bold text-link">{formatTicketNumber(ticket.number)}</span>
        <TicketStatusBadge status={ticket.status} closeReason={ticket.closeReason} />
        <TicketFlags ticket={ticket} />
      </div>
      {ticket.details && <p className="whitespace-pre-wrap break-words text-base leading-8 text-fg">{ticket.details}</p>}
      {opening && <TicketFiles ticketId={ticket.id} event={opening} />}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-neutral-200 pt-5 sm:grid-cols-3">
        {facts.map(([label, value]) => <div key={label}><dt className="text-sm text-muted">{label}</dt><dd className="text-base font-bold">{value}</dd></div>)}
      </dl>
    </section>
  );
}
