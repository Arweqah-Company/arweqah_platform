import { TICKET_STATUSES, type TicketListItemDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { KanbanColumn } from '@/shared/ui';
import { TicketFlags } from '../ticket-badges';
import { QuickReply } from './quick-reply';

function TicketCard({ ticket }: { ticket: TicketListItemDto }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const who = ticket.assignee ?? ticket.sender;
  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm shadow-ink/5">
      <Link to={`/tickets/${ticket.id}`} className="block break-words text-sm font-medium hover:underline">
        <span dir="ltr" className="me-1 text-muted">#{ticket.number}</span>{ticket.title}
      </Link>
      <p className="mt-1 text-xs text-muted">{ar ? ticket.deskNameAr : ticket.deskNameEn} · {ar ? ticket.typeNameAr : ticket.typeNameEn}</p>
      <p className="text-xs text-muted">{ticket.assignee ? t('board.assignee', { name: who.name }) : t('board.sender', { name: who.name })}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span dir="ltr" className="text-muted">{ticket.neededBy}</span>
        <TicketFlags ticket={ticket} />
        <span className="ms-auto"><QuickReply ticket={ticket} /></span>
      </div>
    </li>
  );
}

/** A read-only Kanban board of tickets, one column per status. Tickets move by their own actions on the ticket page, so cards are links, not drag items. */
export function TicketBoard({ tickets }: { tickets: TicketListItemDto[] }) {
  const { t } = useTranslation('tickets');
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" tabIndex={0} role="region" aria-label={t('board.label')}>
      {TICKET_STATUSES.map((status) => {
        const cards = tickets.filter((x) => x.status === status);
        return (
          <KanbanColumn key={status} title={t(`status.${status}`)} count={cards.length}>
            {cards.map((x) => <TicketCard key={x.id} ticket={x} />)}
          </KanbanColumn>
        );
      })}
    </div>
  );
}
