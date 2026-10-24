import { riyadhToday } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input } from '@/shared/ui';
import { useLogTime } from '../api';

/** Logs time worked; a day up to the policy's back-dating days is accepted. */
export function TimeDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const today = riyadhToday();
  const run = useLogTime(taskId);
  const [minutes, setMinutes] = useState('');
  const [day, setDay] = useState(today);
  const valid = Number(minutes) >= 1 && Number(minutes) <= 1440 && !!day && day <= today;
  const submit = async () => {
    try {
      await run.mutateAsync({ minutes: Math.round(Number(minutes)), workedOn: day });
      toast.success(t('time.done'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('time.title')} description={t('time.description')}>
      <div className="flex flex-col gap-4">
        {run.isError && <Alert>{errorMessage(tc, run.error)}</Alert>}
        <FormField label={`${t('time.minutes')} *`}>{(p) => <Input {...p} type="number" dir="ltr" min={1} max={1440} aria-required autoFocus value={minutes} onChange={(e) => setMinutes(e.target.value)} />}</FormField>
        <FormField label={`${t('time.day')} *`}>{(p) => <Input {...p} type="date" dir="ltr" max={today} value={day} onChange={(e) => setDay(e.target.value)} />}</FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={run.isPending || !valid} onClick={() => void submit()}>{t('time.confirm')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
