import { formatTicketNumber, type TicketListItemDto, type TicketTab } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { Column } from '@/shared/ui';
import { TicketFlags, TicketStatusBadge } from './ticket-badges';

/** The columns of a ticket list; the inbox shows who sent it, "my tickets" shows who is handling it. */
export function useTicketColumns(tab: TicketTab) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const day = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);
  const columns: Column<TicketListItemDto>[] = [
    { id: 'number', header: t('columns.number'), className: 'whitespace-nowrap', cell: (x) => <Link to={`/tickets/${x.id}`} className="text-link underline-offset-2 hover:underline" dir="ltr">{formatTicketNumber(x.number)}</Link> },
    { id: 'title', header: t('columns.title'), className: 'min-w-56', cell: (x) => <span className="flex flex-col gap-1"><Link to={`/tickets/${x.id}`} className="font-medium hover:underline">{x.title}</Link><TicketFlags ticket={x} /></span> },
    { id: 'desk', header: t('columns.desk'), cell: (x) => (ar ? x.deskNameAr : x.deskNameEn) },
    { id: 'type', header: t('columns.type'), cell: (x) => (ar ? x.typeNameAr : x.typeNameEn) },
    tab === 'inbox' ? { id: 'sender', header: t('columns.sender'), cell: (x) => x.sender.name } : { id: 'assignee', header: t('columns.assignee'), cell: (x) => x.assignee?.name ?? '—' },
    { id: 'status', header: t('columns.status'), cell: (x) => <TicketStatusBadge status={x.status} closeReason={x.closeReason} /> },
    { id: 'neededBy', header: t('columns.neededBy'), className: 'whitespace-nowrap', cell: (x) => <span dir="ltr">{x.neededBy}</span> },
    { id: 'activity', header: t('columns.activity'), className: 'whitespace-nowrap text-muted', cell: (x) => day(x.lastActivityAt) },
  ];
  return columns;
}
