import { OBJECTION_REASON_MIN, type ObjectionRowDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, Dialog, DialogFooter, FormField, Textarea } from '@/shared/ui';
import { useRejectObjection } from './api';

/** Refusing an objection: the written reason (10 characters) the employee will read. */
export function RejectDialog({ row, onClose }: { row: ObjectionRowDto; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const reject = useRejectObjection();
  const [reason, setReason] = useState('');
  const short = reason.trim().length < OBJECTION_REASON_MIN;
  const submit = () => reject.mutate({ id: row.id, reason: reason.trim() }, { onSuccess: () => { toast.success(t('objections.rejected')); onClose(); } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('objections.rejectTitle', { name: row.employeeName })} description={row.reason}>
      <div className="flex flex-col gap-4">
        <FormField label={t('objections.rejectReason')} hint={t('objections.rejectHint', { count: OBJECTION_REASON_MIN })}>{(p) => <Textarea {...p} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}</FormField>
        {reject.isError && <Alert tone="danger">{t('objections.failed')}</Alert>}
      </div>
      <DialogFooter>
        <Button variant="danger" disabled={short || reject.isPending} onClick={submit}>{t('objections.reject')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
