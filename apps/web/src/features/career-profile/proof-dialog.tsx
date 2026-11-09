import { PROOF_KINDS, PROOF_NOTE_MAX, MAX_UPLOAD_BYTES, type LearningRecordDto, type ProofKind } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, Dialog, DialogFooter, FileDropzone, FormField, Textarea } from '@/shared/ui';
import { useSubmitProof } from './api';

/** The kind of proof as a card to choose: what it is and who approves it. */
function KindCards({ value, onChange }: { value: ProofKind; onChange: (kind: ProofKind) => void }) {
  const { t } = useTranslation('career-profile');
  return (
    <div role="radiogroup" aria-label={t('proof.kind')} className="grid gap-2">
      {PROOF_KINDS.map((kind) => (
        <label key={kind} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-300 bg-white p-3 has-[:checked]:border-link has-[:checked]:bg-petrol-50 has-[:checked]:ring-2 has-[:checked]:ring-link">
          <input type="radio" name="proof-kind" className="mt-1 size-4 accent-petrol-800" checked={value === kind} onChange={() => onChange(kind)} />
          <span><b className="block text-fg">{t(`proof.kinds.${kind}.title`)}</b><span className="text-sm text-muted">{t(`proof.kinds.${kind}.hint`)}</span></span>
        </label>
      ))}
    </div>
  );
}

/** «Send a proof»: its kind, the file (a certificate needs one), a note for the reviewer; a rejected proof shows why it was rejected. */
export function ProofDialog({ unitId, unitTitle, record, onClose }: { unitId: string; unitTitle: string; record?: LearningRecordDto; onClose: () => void }) {
  const { t } = useTranslation('career-profile');
  const send = useSubmitProof();
  const [kind, setKind] = useState<ProofKind>('certificate');
  const [file, setFile] = useState<File>();
  const [note, setNote] = useState('');
  const missingFile = kind === 'certificate' && !file;
  const submit = () => send.mutate({ unitId, kind, note: note.trim() || undefined, file }, { onSuccess: () => { toast.success(t('proof.sent')); onClose(); } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('proof.title')} description={unitTitle}>
      {record?.status === 'rej' && <Alert tone="danger">{t('proof.rejectedBecause', { reason: record.rejectionReason })}</Alert>}
      <KindCards value={kind} onChange={setKind} />
      <FileDropzone label={t('proof.pick')} hint={t('proof.fileHint')} accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" maxBytes={MAX_UPLOAD_BYTES} busy={send.isPending} onFiles={(files) => setFile(files[0])} />
      {file && <p className="text-sm text-muted">{t('proof.chosenFile', { name: file.name })}</p>}
      {missingFile && <p className="text-sm text-danger">{t('proof.fileRequired')}</p>}
      <FormField label={t('proof.note')}>{(p) => <Textarea {...p} rows={3} maxLength={PROOF_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />}</FormField>
      {send.isError && <Alert tone="danger">{t('proof.failed')}</Alert>}
      <DialogFooter>
        <Button disabled={missingFile || send.isPending} onClick={submit}>{t('proof.send')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('file.close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
