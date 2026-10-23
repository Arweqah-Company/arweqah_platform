import { Can } from '@/core/permissions/can';
import { CorePermission, formatTicketNumber, type TicketDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, PageHeader } from '@/shared/ui';
import { useTicket } from '../api';
import { TicketFlags, TicketStatusBadge } from '../ticket-badges';
import { ReplyBox } from './reply-box';
import { TicketActions } from './ticket-actions';
import { TicketTimeline } from './ticket-timeline';

function Facts({ ticket }: { ticket: TicketDto }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const day = (iso: string) => new Date(iso).toLocaleDateString(i18n.language);
  const rows: [string, string][] = [
    [t('columns.desk'), ar ? ticket.deskNameAr : ticket.deskNameEn],
    [t('columns.type'), ar ? ticket.typeNameAr : ticket.typeNameEn],
    [t('columns.sender'), ticket.sender.name],
    [t('columns.assignee'), ticket.assignee?.name ?? '—'],
    [t('columns.neededBy'), ticket.neededBy],
    [t('details.sentOn'), day(ticket.createdAt)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm sm:grid-cols-3">
      {rows.map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="font-medium">{value}</dd></div>)}
    </dl>
  );
}

export function TicketDetailsPage() {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const { id } = useParams();
  const query = useTicket(id);
  if (query.isError) return <Alert>{errorMessage(tc, query.error)}</Alert>;
  const ticket = query.data;
  if (!ticket) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  return (
    <>
      <PageHeader title={`${formatTicketNumber(ticket.number)} · ${ticket.title}`} description={t('details.pageHint')} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2"><TicketStatusBadge status={ticket.status} closeReason={ticket.closeReason} /><TicketFlags ticket={ticket} /></div>
        <Facts ticket={ticket} />
        <TicketActions ticket={ticket} />
        <TicketTimeline ticket={ticket} />
        {ticket.abilities.reply ? <Can permission={CorePermission.TicketsReply}><ReplyBox ticketId={ticket.id} /></Can> : <Alert tone="info">{t('reply.closedNote')}</Alert>}
      </div>
    </>
  );
}
