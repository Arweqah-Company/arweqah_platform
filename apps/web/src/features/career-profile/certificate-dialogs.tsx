import { CorePermission, PROOF_REASON_MAX, PROOF_REASON_MIN, type CertificateReviewItemDto } from '@arweqah-platform/shared';
import { Check, Download, Forward, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { Alert, Button, Dialog, DialogFooter, FormField, Textarea } from '@/shared/ui';
import { useDecideProof } from './api';

export type CertificateDialogState = { kind: 'review' | 'reject'; item: CertificateReviewItemDto } | null;

const nameOf = (item: CertificateReviewItemDto, ar: boolean): string => (ar ? item.unitNameAr : item.unitNameEn) || item.unitNameAr || '';

/** Rejects a proof: the reason (at least five characters) goes to the employee. */
function RejectDialog({ item, onClose }: { item: CertificateReviewItemDto; onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  const [reason, setReason] = useState('');
  const { reject } = useDecideProof(item.id);
  const short = reason.trim().length < PROOF_REASON_MIN;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('certs.reject.title')} description={`${item.employeeName} · ${item.unitTitle}`}>
      <FormField label={t('certs.reject.reason')} error={reason && short ? t('certs.reject.short') : undefined}>
        {(p) => <Textarea {...p} rows={3} maxLength={PROOF_REASON_MAX} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </FormField>
      {reject.isError && <Alert tone="danger">{t('certs.failed')}</Alert>}
      <DialogFooter>
        <Button variant="danger" disabled={short || reject.isPending} onClick={() => reject.mutate(reason.trim(), { onSuccess: () => { toast.success(t('certs.reject.done')); onClose(); } })}>{t('certs.reject.confirm')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('file.close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}

/** The review window: who sent what, the file, and the three decisions (each with its own key). */
function ReviewDialog({ item, onClose, onReject }: { item: CertificateReviewItemDto; onClose: () => void; onReject: () => void }) {
  const { t, i18n } = useTranslation('career-profile');
  const { approve, refer } = useDecideProof(item.id);
  const open = item.status === 'wait' || item.status === 'referred';
  const done = (key: string) => () => { toast.success(t(key)); onClose(); };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={item.unitTitle || t('certs.unitGone')} description={item.employeeName} wide>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {([[t('certs.columns.unit'), nameOf(item, i18n.language === 'ar')], [t('proof.kind'), t(`proof.kinds.${item.kind}.title`)], [t('certs.columns.minutes'), `${item.minutes / 60}`], [t('proof.submittedAt'), new Date(item.submittedAt).toLocaleDateString()], [t('certs.columns.status'), t(`proof.state.${item.status}`)], [t('proof.note'), item.note]] as [string, string | null][]).map(([label, value]) => (
          <div key={label} className="min-w-0"><dt className="text-xs text-muted">{label}</dt><dd className="break-words font-medium">{value ?? '—'}</dd></div>
        ))}
      </dl>
      {item.hasFile && <a className="inline-flex items-center gap-2 font-medium text-link underline" href={`/api/career/certificates/${item.id}/file`} target="_blank" rel="noopener noreferrer"><Download className="size-4" aria-hidden />{item.fileName ?? t('proof.file')}</a>}
      {item.rejectionCount > 0 && <Alert tone="warning">{t('certs.rejectedBefore', { count: item.rejectionCount })}</Alert>}
      {(approve.isError || refer.isError) && <Alert tone="danger">{t('certs.failed')}</Alert>}
      {open && (
        <DialogFooter>
          <Can permission={CorePermission.CareerCertificatesApprove}><Button disabled={approve.isPending} onClick={() => approve.mutate(undefined, { onSuccess: done('certs.approved') })}><Check className="size-4" aria-hidden />{t('certs.approve')}</Button></Can>
          <Can permission={CorePermission.CareerCertificatesReject}><Button variant="danger" onClick={onReject}><X className="size-4" aria-hidden />{t('certs.reject.action')}</Button></Can>
          <Can permission={CorePermission.CareerCertificatesRefer}>{item.status === 'wait' && <Button variant="secondary" disabled={refer.isPending} onClick={() => refer.mutate(undefined, { onSuccess: done('certs.referred') })}><Forward className="size-4" aria-hidden />{t('certs.refer')}</Button>}</Can>
        </DialogFooter>
      )}
    </Dialog>
  );
}

/** The dialog of the row the reviewer opened. */
export function CertificateDialogs({ state, onChange }: { state: CertificateDialogState; onChange: (state: CertificateDialogState) => void }) {
  if (!state) return null;
  const close = () => onChange(null);
  if (state.kind === 'reject') return <RejectDialog item={state.item} onClose={close} />;
  return <ReviewDialog item={state.item} onClose={close} onReject={() => onChange({ kind: 'reject', item: state.item })} />;
}
