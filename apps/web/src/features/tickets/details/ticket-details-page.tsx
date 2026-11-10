import { Can } from '@/core/permissions/can';
import { CorePermission, formatTicketNumber } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, PageHeader } from '@/shared/ui';
import { useTicket } from '../api';
import { ReplyBox } from './reply-box';
import { TicketCard } from './ticket-card';
import { TicketActions } from './ticket-actions';
import { TicketTimeline } from './ticket-timeline';

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
        <TicketCard ticket={ticket} />
        <TicketActions ticket={ticket} />
        <TicketTimeline ticket={ticket} />
        {ticket.abilities.reply ? <Can permission={CorePermission.TicketsReply}><ReplyBox ticketId={ticket.id} /></Can> : <Alert tone="info">{t('reply.closedNote')}</Alert>}
      </div>
    </>
  );
}
