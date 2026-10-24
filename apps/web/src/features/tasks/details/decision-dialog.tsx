import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Textarea } from '@/shared/ui';
import { useDecide, type DecideAction } from '../api';

/** Approve, reject or resubmit: an optional note, then the decision. */
export function DecisionDialog({ taskId, revision, action, onClose }: { taskId: string; revision: number; action: DecideAction; onClose: () => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const run = useDecide(taskId);
  const [note, setNote] = useState('');
  const submit = async () => {
    try {
      await run.mutateAsync({ action, revision, note: note.trim() || undefined });
      toast.success(t(`decision.${action}.done`));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t(`decision.${action}.title`)} description={t(`decision.${action}.description`)}>
      <div className="flex flex-col gap-4">
        {run.isError && <Alert>{errorMessage(tc, run.error)}</Alert>}
        <FormField label={t('decision.note')}>{(p) => <Textarea {...p} rows={3} maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} />}</FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button variant={action === 'reject' ? 'danger' : 'primary'} disabled={run.isPending} onClick={() => void submit()}>{t(`decision.${action}.confirm`)}</Button>
        </div>
      </div>
    </Dialog>
  );
}
