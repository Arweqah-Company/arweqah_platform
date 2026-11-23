import { NOTICE_LIMITS, type NoticeListItemDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError } from '@/shared/lib/live-validation';
import { Alert, Button, Dialog, FormField, Textarea } from '@/shared/ui';
import { useRejectNotice } from '../api';

/** «Reject the notice»: the reason (five characters at least) goes back to the writer with the draft. */
function Body({ notice, onClose }: { notice: NoticeListItemDto; onClose: () => void }) {
  const { t } = useTranslation('notices');
  const { t: tc } = useTranslation();
  const reject = useRejectNotice();
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= NOTICE_LIMITS.rejectReasonMin;
  const live = useLiveError(reason, (v: string) => (v.trim().length < NOTICE_LIMITS.rejectReasonMin ? t('reject.tooShort') : undefined));
  const submit = async () => {
    try {
      await reject.mutateAsync({ id: notice.id, reason: reason.trim() });
      toast.success(t('reject.done'));
      onClose();
    } catch {
      /* shown below */
    }
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (valid) void submit(); }} noValidate>
      {reject.isError && <Alert>{errorMessage(tc, reject.error)}</Alert>}
      <FormField label={`${t('reject.reason')} *`} error={live.error}>
        {(p) => <Textarea {...p} rows={4} aria-required maxLength={NOTICE_LIMITS.rejectReasonMax} placeholder={t('reject.placeholder')} onBlur={live.onBlur} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />}
      </FormField>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onClose}>{tc('actions.cancel')}</Button>
        <Button variant="danger" type="submit" disabled={!valid || reject.isPending}>{t('reject.submit')}</Button>
      </div>
    </form>
  );
}

export function RejectDialog({ notice, onClose }: { notice: NoticeListItemDto | null; onClose: () => void }) {
  const { t } = useTranslation('notices');
  return (
    <Dialog open={!!notice} onOpenChange={(open) => !open && onClose()} title={t('reject.title')} description={t('reject.description')}>
      {notice && <Body key={notice.id} notice={notice} onClose={onClose} />}
    </Dialog>
  );
}
