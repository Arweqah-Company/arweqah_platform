import type { AccessExceptionDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Input } from '@/shared/ui';
import { useSetExpiry } from './api';
import { refOf } from './exceptions-list';

/** Changes the last day of an exception, or removes it (no end date). */
export function ExpiryDialog({ item, targetName, onClose }: { item: AccessExceptionDto; targetName: string; onClose: () => void }) {
  const { t } = useTranslation('exceptions');
  const { t: tc } = useTranslation();
  const [day, setDay] = useState(item.expiresAt ?? '');
  const save = useSetExpiry();
  const submit = async (expiresAt: string | null) => {
    try {
      await save.mutateAsync({ ref: refOf(item), expiresAt });
      toast.success(t('expirySaved'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('expiryTitle')} description={`${item.userName} · ${targetName}`}>
      <div className="flex flex-col gap-4">
        {save.isError && <Alert>{errorMessage(tc, save.error)}</Alert>}
        <FormField label={t('expires')} hint={t('expiryHint')}>{(p) => <Input {...p} type="date" dir="ltr" value={day} onChange={(e) => setDay(e.target.value)} />}</FormField>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          {item.expiresAt && <Button variant="secondary" disabled={save.isPending} onClick={() => void submit(null)}>{t('removeEnd')}</Button>}
          <Button disabled={save.isPending || !day} onClick={() => void submit(day)}>{tc('actions.save')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
