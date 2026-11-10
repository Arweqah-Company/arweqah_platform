import { CorePermission, formatTicketNumber, type TicketListItemDto } from '@arweqah-platform/shared';
import { MessageSquareReply } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { Dialog, RowAction } from '@/shared/ui';
import { ReplyBox } from '../details/reply-box';

/** «Quick reply» on a card of the board: the ticket's own reply box in a window, so a reply needs no trip to the ticket page. Closed tickets take none. */
export function QuickReply({ ticket }: { ticket: Pick<TicketListItemDto, 'id' | 'number' | 'title' | 'status'> }) {
  const { t } = useTranslation('tickets');
  const [open, setOpen] = useState(false);
  if (ticket.status === 'closed') return null;
  return (
    <Can permission={CorePermission.TicketsReply}>
      <RowAction label={t('board.quickReply')} icon={MessageSquareReply} onClick={() => setOpen(true)} />
      {open && (
        <Dialog open wide onOpenChange={setOpen} title={t('board.quickReplyTitle', { number: formatTicketNumber(ticket.number) })} description={ticket.title}>
          <ReplyBox ticketId={ticket.id} onDone={() => setOpen(false)} />
        </Dialog>
      )}
    </Can>
  );
}
