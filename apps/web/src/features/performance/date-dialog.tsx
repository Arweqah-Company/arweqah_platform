import type { CycleDate } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, Dialog, DialogFooter, FormField, Input } from '@/shared/ui';
import { useSetDate } from './api';
import { dateMessage } from './date-message';

/** One date of the cycle: «from» is required and «to» is optional; a date that does not fit the others is refused in words as it is typed, with the day it runs into. */
export function DateDialog({ date, dates, onClose }: { date: CycleDate; dates: readonly CycleDate[]; onClose: () => void }) {
  const { t, i18n } = useTranslation('performance');
  const save = useSetDate();
  const [from, setFrom] = useState(date.from);
  const [to, setTo] = useState(date.to ?? '');
  const [tried, setTried] = useState(false);
  const message = dateMessage(t, i18n.language, dates, { key: date.key, from, to: to || null });
  const shown = tried || from !== date.from || to !== (date.to ?? '') ? message : undefined;
  const submit = () => {
    setTried(true);
    if (!message) save.mutate({ key: date.key, from, to: to || null }, { onSuccess: () => { toast.success(t('dates.saved')); onClose(); } });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('dates.edit')} description={t(`dates.keys.${date.key}`)}>
      <div className="flex flex-col gap-4">
        <FormField label={t('dates.from')}>{(p) => <Input {...p} type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />}</FormField>
        <FormField label={t('dates.to')}>{(p) => <Input {...p} type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />}</FormField>
        <p role="alert" className="text-sm text-danger-text empty:hidden">{shown}</p>
        {save.isError && <Alert tone="danger">{t('dates.failed')}</Alert>}
        <p className="text-sm text-muted">{t('dates.note')}</p>
      </div>
      <DialogFooter>
        <Button disabled={save.isPending} onClick={submit}>{t('dates.save')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
