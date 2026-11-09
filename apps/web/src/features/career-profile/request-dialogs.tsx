import { CorePermission, REQUEST_REASON_MIN, type DevelopmentRequestDto } from '@arweqah-platform/shared';
import { Check, Download, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { Alert, Button, Dialog, DialogFooter, FormField, Textarea } from '@/shared/ui';
import { useDecideRequest } from './api';

export type RequestDialogState = { kind: 'open' | 'reject'; item: DevelopmentRequestDto } | null;

/** Rejects a request: the reason (at least five characters) goes to the employee. */
function RejectDialog({ item, onClose }: { item: DevelopmentRequestDto; onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  const [reason, setReason] = useState('');
  const { reject } = useDecideRequest(item.id);
  const short = reason.trim().length < REQUEST_REASON_MIN;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('requests.reject.title')} description={`${item.employeeName} · ${item.courseName}`}>
      <FormField label={t('requests.reject.reason')} error={reason && short ? t('requests.reject.short') : undefined}>{(p) => <Textarea {...p} rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}</FormField>
      {reject.isError && <Alert tone="danger">{t('requests.decideFailed')}</Alert>}
      <DialogFooter>
        <Button variant="danger" disabled={short || reject.isPending} onClick={() => reject.mutate(reason.trim(), { onSuccess: () => { toast.success(t('requests.reject.done')); onClose(); } })}>{t('requests.reject.confirm')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('file.close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}

const facts = (item: DevelopmentRequestDto, t: (key: string, options?: Record<string, unknown>) => string): [string, string | null][] => [
  [t('requests.columns.course'), item.courseName], [t('requests.columns.cost'), t('requests.riyals', { amount: item.cost.toLocaleString('en') })], [t('requests.columns.plan'), t(`requests.planKind.${item.plan}`)],
  [t('requests.columns.level'), t(`requests.whoLevel.${item.level}`)], [t('requests.columns.status'), t(`requests.status.${item.status}`)], [t('requests.columns.submitted'), new Date(item.submittedAt).toLocaleDateString()],
];

/** The window of a request: its facts, the agreement, and the two decisions for the person it is with (each with its own key). */
function OpenDialog({ item, onClose, onReject }: { item: DevelopmentRequestDto; onClose: () => void; onReject: () => void }) {
  const { t } = useTranslation('career-profile');
  const { approve } = useDecideRequest(item.id);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={item.courseName} description={item.employeeName} wide>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {facts(item, t).map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted">{label}</dt><dd className="break-words font-medium">{value ?? '—'}</dd></div>)}
      </dl>
      {item.hasAgreement && <a className="inline-flex items-center gap-2 font-medium text-link underline" href={`/api/career/requests/${item.id}/agreement`} target="_blank" rel="noopener noreferrer"><Download className="size-4" aria-hidden />{item.agreementName ?? t('requests.agreementFile')}</a>}
      {item.overBudget && <Alert tone="warning">{t('requests.overBudget')}</Alert>}
      {item.status === 'rejected' && item.rejectionReason && <Alert tone="danger">{t('requests.rejectedBecause')}: {item.rejectionReason}</Alert>}
      {item.status === 'pending' && !item.canDecide && <Alert tone="info">{t('requests.page.notYours')}</Alert>}
      {approve.isError && <Alert tone="danger">{t('requests.decideFailed')}</Alert>}
      {item.canDecide && (
        <DialogFooter>
          <Can permission={CorePermission.CareerRequestsApprove}><Button disabled={approve.isPending} onClick={() => approve.mutate(undefined, { onSuccess: () => { toast.success(t('requests.approved')); onClose(); } })}><Check className="size-4" aria-hidden />{t('requests.approve')}</Button></Can>
          <Can permission={CorePermission.CareerRequestsReject}><Button variant="danger" onClick={onReject}><X className="size-4" aria-hidden />{t('requests.reject.action')}</Button></Can>
        </DialogFooter>
      )}
    </Dialog>
  );
}

/** The dialog of the row the approver opened. */
export function RequestDialogs({ state, onChange }: { state: RequestDialogState; onChange: (state: RequestDialogState) => void }) {
  if (!state) return null;
  const close = () => onChange(null);
  if (state.kind === 'reject') return <RejectDialog item={state.item} onClose={close} />;
  return <OpenDialog item={state.item} onClose={close} onReject={() => onChange({ kind: 'reject', item: state.item })} />;
}
