import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, Dialog, FormField } from '@/shared/ui';
import { useTicketAssignees, useTicketReassign } from '../api';

/** Hands the ticket to another employee: the list holds only people inside the reach of the person's reassign key. */
export function ReassignDialog({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const people = useTicketAssignees(ticketId, search);
  const run = useTicketReassign(ticketId);
  const options = (people.data ?? []).map((p) => ({ value: p.id, label: p.name }));
  const submit = async () => {
    if (!chosen) return;
    try {
      await run.mutateAsync(chosen);
      toast.success(t('actions.reassign.done'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('actions.reassign.title')} description={t('actions.reassign.description')}>
      <div className="flex flex-col gap-4">
        {run.isError && <Alert>{errorMessage(tc, run.error)}</Alert>}
        <FormField label={t('actions.reassign.person')} hint={t('actions.reassign.personHint')}>
          {(p) => <Combobox id={p.id} label={t('actions.reassign.person')} value={chosen} options={options} onSearch={setSearch} onChange={setChosen} />}
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!chosen || run.isPending} onClick={() => void submit()}>{t('actions.reassign.confirm')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
