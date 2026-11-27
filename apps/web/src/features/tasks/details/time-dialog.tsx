import { riyadhToday } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input } from '@/shared/ui';
import { useLogTime } from '../api';
import { TimeFields } from './time-fields';
import { checkTime } from './time-rules';

/** Logs time worked as hours and minutes (up to a day per entry); a day up to the policy's back-dating days is accepted. */
export function TimeDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const today = riyadhToday();
  const run = useLogTime(taskId);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [day, setDay] = useState(today);
  const check = checkTime(hours, minutes);
  const valid = check.valid && !!day && day <= today;
  const submit = async () => {
    try {
      await run.mutateAsync({ minutes: check.total, workedOn: day });
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
        <TimeFields hours={hours} minutes={minutes} onHours={setHours} onMinutes={setMinutes} />
        <FormField label={`${t('time.day')} *`}>{(p) => <Input {...p} type="date" dir="ltr" max={today} value={day} onChange={(e) => setDay(e.target.value)} />}</FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={run.isPending || !valid} onClick={() => void submit()}>{t('time.confirm')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
