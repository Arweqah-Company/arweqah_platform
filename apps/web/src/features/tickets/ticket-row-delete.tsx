import { formatTicketNumber, type TicketListItemDto } from '@arweqah-platform/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { ConfirmDialog, RowAction } from '@/shared/ui';
import { useDeleteTicket } from './api';

/** The trash icon of a ticket's row: hides the ticket from everyone after a confirmation (FR-158); the row offers it only when the API says the viewer may. */
export function TicketRowDelete({ ticket }: { ticket: TicketListItemDto }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const remove = useDeleteTicket(ticket.id);
  const [open, setOpen] = useState(false);
  const confirm = async () => {
    try {
      await remove.mutateAsync();
      toast.success(t('actions.delete.done'));
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(tc, error));
    }
  };
  return (
    <>
      <RowAction label={tc('actions.delete')} icon={Trash2} danger onClick={() => setOpen(true)} />
      <ConfirmDialog open={open} onOpenChange={setOpen} tone="danger" busy={remove.isPending} title={t('actions.delete.title', { number: formatTicketNumber(ticket.number) })} description={t('actions.delete.description')} confirmLabel={tc('actions.delete')} onConfirm={confirm} />
    </>
  );
}
