import { OBJECTION_REASONS, type ObjectionReason } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Dialog, FormField, Select, Textarea } from '@/shared/ui';
import { useAnswerObjection, useObject, useTaskOptions } from '../api';

/** The assignee objects with one of four reasons; unanswered, the objection lapses after the policy's days. */
export function ObjectionDialog({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const run = useObject(taskId);
  const [reason, setReason] = useState<ObjectionReason>('not_my_scope');
  const [note, setNote] = useState('');
  const submit = async () => {
    try {
      await run.mutateAsync({ reason, note: note.trim() || undefined });
      toast.success(t('objection.done'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('objection.title')} description={t('objection.description')}>
      <div className="flex flex-col gap-4">
        {run.isError && <Alert>{errorMessage(tc, run.error)}</Alert>}
        <FormField label={`${t('objection.reasonLabel')} *`}>
          {(p) => <Select {...p} value={reason} onChange={(e) => setReason(e.target.value as ObjectionReason)}>{OBJECTION_REASONS.map((r) => <option key={r} value={r}>{t(`objection.reason.${r}`)}</option>)}</Select>}
        </FormField>
        <FormField label={t('objection.note')}>{(p) => <Textarea {...p} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}</FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={run.isPending} onClick={() => void submit()}>{t('objection.confirm')}</Button>
        </div>
      </div>
    </Dialog>
  );
}

/** Whoever gave the task closes the objection: rejecting keeps the task as it is; accepting gives it to somebody else, who must be chosen. */
export function AnswerDialog({ taskId, currentAssigneeId, onClose }: { taskId: string; currentAssigneeId: string; onClose: () => void }) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const run = useAnswerObjection(taskId);
  const people = (useTaskOptions().data?.assignees ?? []).filter((a) => a.id !== currentAssigneeId);
  const [accept, setAccept] = useState(true);
  const [assigneeId, setAssigneeId] = useState('');
  const [note, setNote] = useState('');
  const submit = async () => {
    try {
      await run.mutateAsync({ accept, note: note.trim() || undefined, newAssigneeUserId: accept ? assigneeId : undefined });
      toast.success(t('objection.answered'));
      onClose();
    } catch {
      /* shown in the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('objection.answerTitle')} description={t('objection.answerDescription')}>
      <div className="flex flex-col gap-4">
        {run.isError && <Alert>{errorMessage(tc, run.error)}</Alert>}
        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 font-medium">{t('objection.outcome')}</legend>
          <label className="flex items-center gap-2"><input type="radio" className="size-4 accent-petrol-800" checked={accept} onChange={() => setAccept(true)} />{t('objection.accept')}</label>
          <label className="flex items-center gap-2"><input type="radio" className="size-4 accent-petrol-800" checked={!accept} onChange={() => setAccept(false)} />{t('objection.reject')}</label>
        </fieldset>
        {accept && (
          <FormField label={`${t('objection.newAssignee')} *`} hint={t('objection.newAssigneeHint')}>
            {(p) => (
              <Select {...p} aria-required value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">{t('objection.choosePerson')}</option>
                {people.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            )}
          </FormField>
        )}
        <FormField label={t('objection.note')}>{(p) => <Textarea {...p} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />}</FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={run.isPending || (accept && !assigneeId)} onClick={() => void submit()}>{t('objection.answerConfirm')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
