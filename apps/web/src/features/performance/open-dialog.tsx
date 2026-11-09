import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { Alert, Button, Dialog, DialogFooter, FormField, Input } from '@/shared/ui';
import { useOpenCycle } from './api';

/** Opens the cycle of a fiscal year: it freezes a snapshot of the templates as they are now. */
export function OpenDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('performance');
  const open = useOpenCycle();
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const valid = /^\d{4}$/.test(year) && Number(year) >= 2020 && Number(year) <= 2100;
  const code = open.error instanceof ApiError ? open.error.code : null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('open.title')} description={t('open.description')}>
      <FormField label={t('open.year')} error={year && !valid ? t('open.yearInvalid') : undefined}>{(p) => <Input {...p} inputMode="numeric" dir="ltr" maxLength={4} value={year} onChange={(e) => setYear(e.target.value.trim())} />}</FormField>
      <Alert tone="info">{t('open.snapshot')}</Alert>
      {open.isError && <Alert tone="danger">{t(code === 'CYCLE_YEAR_EXISTS' ? 'open.yearExists' : code === 'CYCLE_NOT_READY' ? 'open.notReady' : 'open.failed')}</Alert>}
      <DialogFooter>
        <Button disabled={!valid || open.isPending} onClick={() => open.mutate({ fiscalYear: Number(year) }, { onSuccess: () => { toast.success(t('open.done')); onClose(); } })}>{t('open.confirm')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
