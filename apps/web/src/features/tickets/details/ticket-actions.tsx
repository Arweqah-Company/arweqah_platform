import { CorePermission, formatTicketNumber, type TicketDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { usePermissions } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, DeleteRecordButton, Dialog, FormField, Textarea } from '@/shared/ui';
import { useDeleteTicket, useTicketAction, type TicketAction } from '../api';
import { ReassignDialog } from './reassign-dialog';

const DANGER: TicketAction[] = ['close-without-execution'];

/** The permission key behind each button. */
const KEY: Record<TicketAction, string> = {
  'request-close': CorePermission.TicketsRequestClose,
  'confirm-close': CorePermission.TicketsConfirmClose,
  'decline-close': CorePermission.TicketsDeclineClose,
  reopen: CorePermission.TicketsReopen,
  'close-without-execution': CorePermission.TicketsCloseWithoutExecution,
};

/** Asks for an optional message, then performs the action. The words come from the action's own texts. */
function ActionDialog({ ticketId, action, onClose }: { ticketId: string; action: TicketAction; onClose: () => void }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const run = useTicketAction(ticketId);
  const [message, setMessage] = useState('');
  const submit = async () => {
    try {
      await run.mutateAsync({ action, message });
      toast.success(t(`actions.${action}.done`));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t(`actions.${action}.title`)} description={t(`actions.${action}.description`)}>
      <div className="flex flex-col gap-4">
        {run.isError && <Alert>{errorMessage(tc, run.error)}</Alert>}
        <FormField label={t('actions.message')}>{(p) => <Textarea {...p} rows={3} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} />}</FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button variant={DANGER.includes(action) ? 'danger' : 'primary'} disabled={run.isPending} onClick={() => void submit()}>{t(`actions.${action}.confirm`)}</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** «Delete»: hides the ticket from everyone after a confirmation, then leaves its page. */
function DeleteTicket({ ticket }: { ticket: TicketDto }) {
  const { t } = useTranslation('tickets');
  const remove = useDeleteTicket(ticket.id);
  const navigate = useNavigate();
  return <DeleteRecordButton label={t('actions.delete.button')} title={t('actions.delete.title', { number: formatTicketNumber(ticket.number) })} description={t('actions.delete.description')} done={t('actions.delete.done')} onDelete={() => remove.mutateAsync()} onDone={() => void navigate('/tickets')} />;
}

/** Reassign and delete: the API allows them for the ticket and the person holds their keys. */
const unitExtras = (a: TicketDto['abilities'], can: (key: string) => boolean) => ({ reassign: a.reassign && can(CorePermission.TicketsReassign), delete: a.delete && can(CorePermission.TicketsDelete) });

/** The buttons this person may use now (the server decides which). */
export function TicketActions({ ticket }: { ticket: TicketDto }) {
  const { t } = useTranslation('tickets');
  const [asking, setAsking] = useState<TicketAction | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const { can } = usePermissions();
  const a = ticket.abilities;
  const buttons: { action: TicketAction; allowed: boolean; variant: 'primary' | 'secondary' | 'danger' }[] = [
    { action: 'request-close', allowed: a.requestClose, variant: 'primary' },
    { action: 'confirm-close', allowed: a.confirmClose, variant: 'primary' },
    { action: 'decline-close', allowed: a.declineClose, variant: 'secondary' },
    { action: 'reopen', allowed: a.reopen, variant: 'secondary' },
    { action: 'close-without-execution', allowed: a.closeWithoutExecution, variant: 'danger' },
  ];
  const shown = buttons.filter((b) => b.allowed && can(KEY[b.action]));
  const { reassign: canReassign, delete: canDelete } = unitExtras(a, can);
  if (shown.length === 0 && !canReassign && !canDelete) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {shown.map((b) => <Button key={b.action} variant={b.variant} onClick={() => setAsking(b.action)}>{t(`actions.${b.action}.button`)}</Button>)}
      {canReassign && <Button variant="secondary" onClick={() => setReassigning(true)}>{t('actions.reassign.button')}</Button>}
      {canDelete && <DeleteTicket ticket={ticket} />}
      {reassigning && <ReassignDialog ticketId={ticket.id} onClose={() => setReassigning(false)} />}
      {a.reopen && ticket.reopenDaysLeft !== null && <span className="text-xs text-muted">{t('actions.reopenLeft', { count: ticket.reopenDaysLeft })}</span>}
      {asking && <ActionDialog ticketId={ticket.id} action={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}
