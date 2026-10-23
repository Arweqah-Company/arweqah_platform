import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Dialog } from '@/shared/ui';
import { useCreateTicket, useTicketCatalog } from '../api';
import { ChooseStep } from './choose-step';
import { DetailsStep } from './details-step';
import { useNewTicket } from './use-new-ticket';

function Body({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation('tickets');
  const { t: tc } = useTranslation();
  const navigate = useNavigate();
  const catalog = useTicketCatalog();
  const create = useCreateTicket();
  const form = useNewTicket(catalog.data);
  if (catalog.isError) return <Alert>{errorMessage(tc, catalog.error)}</Alert>;
  if (!catalog.data) return <p role="status" className="text-sm text-muted">{t('loading')}</p>;
  if (catalog.data.desks.length === 0) return <Alert tone="info">{t('choose.nothing')}</Alert>;
  if (!form.choice) return <ChooseStep catalog={catalog.data} onChoose={form.choose} />;
  const { choice, draft } = form;
  const submit = async () => {
    try {
      const ticket = await create.mutateAsync({ typeId: choice.type.id, title: draft.title, details: draft.details, priority: draft.urgent ? 1 : 0, neededBy: draft.neededBy, fileIds: draft.files.map((f) => f.id) });
      toast.success(t('sent'));
      onDone();
      navigate(`/tickets/${ticket.id}`);
    } catch {
      /* the error is shown in the form */
    }
  };
  return <DetailsStep choice={choice} draft={draft} today={catalog.data.today} busy={create.isPending} error={create.isError ? errorMessage(tc, create.error) : null} onPatch={form.patch} onBack={form.back} onSubmit={() => void submit()} />;
}

/** "New ticket": the form lives only while the dialog is open, so it starts fresh every time. */
export function NewTicketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('tickets');
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('new.title')} description={t('new.description')}>
      {open && <Body onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}
