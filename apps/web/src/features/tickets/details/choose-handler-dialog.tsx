import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, Dialog, FormField } from '@/shared/ui';
import { useChooseHandler } from '../api';

/** The head picks who answers a ticket of a type with several handlers: the list is the handlers named on the type, and the others stop seeing the ticket. */
export function ChooseHandlerDialog({ ticketId, handlers, onClose }: { ticketId: string; handlers: { id: string; name: string }[]; onClose: () => void }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const [chosen, setChosen] = useState<string | null>(null);
  const run = useChooseHandler(ticketId);
  const options = handlers.map((h) => ({ value: h.id, label: h.name }));
  const submit = async () => {
    if (!chosen) return;
    try {
      await run.mutateAsync(chosen);
      toast.success(t('actions.chooseHandler.done'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('actions.chooseHandler.title')} description={t('actions.chooseHandler.description')}>
      <div className="flex flex-col gap-4">
        {run.isError && <Alert>{errorMessage(tc, run.error)}</Alert>}
        <FormField label={t('actions.chooseHandler.person')} hint={t('actions.chooseHandler.personHint')}>
          {(p) => <Combobox id={p.id} label={t('actions.chooseHandler.person')} value={chosen} options={options} onChange={setChosen} />}
        </FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!chosen || run.isPending} onClick={() => void submit()}>{t('actions.chooseHandler.confirm')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
