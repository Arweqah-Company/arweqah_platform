import { TICKET_STATUSES, type TicketListItemDto, type TicketStatus } from '@arweqah-platform/shared';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { Select } from '@/shared/ui/select';
import { TicketFlags } from '../ticket-badges';
import { QuickReply } from './quick-reply';

/** What a card shows: the number and title (a link to the ticket), desk and type, who, when it is needed, the marks and the quick reply. */
export function TicketCardBody({ ticket }: { ticket: TicketListItemDto }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const who = ticket.assignee ?? ticket.sender;
  return (
    <>
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
    </>
  );
}

interface Props {
  ticket: TicketListItemDto;
  /** The statuses this person may move the ticket to (none: the card has no handle and no menu). */
  targets: TicketStatus[];
  onMove: (ticket: TicketListItemDto, to: TicketStatus) => void;
}

/** A card dragged by its handle (so the title link and the quick reply stay clickable and a phone can still scroll the board), with a «move to» menu for the keyboard and the phone. */
export function TicketCard({ ticket, targets, onMove }: Props) {
  const { t } = useTranslation('tickets');
  const movable = targets.length > 0;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id, disabled: !movable });
  return (
    <li ref={setNodeRef} className={cn('rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm shadow-ink/5', isDragging && 'opacity-40')}>
      <TicketCardBody ticket={ticket} />
      {movable && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-neutral-200 pt-2">
          <button type="button" aria-label={t('board.drag', { title: ticket.title })} className="grid size-9 touch-none place-items-center rounded-lg text-muted hover:bg-neutral-50 hover:text-fg" {...attributes} {...listeners}>
            <GripVertical className="size-4" aria-hidden />
          </button>
          <Select aria-label={t('board.moveTo', { title: ticket.title })} className="h-9 min-w-0 flex-1 text-xs" value={ticket.status} onChange={(e) => onMove(ticket, e.target.value as TicketStatus)}>
            {TICKET_STATUSES.filter((s) => s === ticket.status || targets.includes(s)).map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
          </Select>
        </div>
      )}
    </li>
  );
}
