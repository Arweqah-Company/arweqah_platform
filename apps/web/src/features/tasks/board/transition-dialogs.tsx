import { MAX_TASK_FILES, type FileDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DateInput, Dialog, FileAttachments, FormField, Textarea } from '@/shared/ui';
import type { MoveExtra, PendingMove } from './use-board-move';

interface Props {
  pending: PendingMove | null;
  busy: boolean;
  today: string;
  onAnswer: (extra: MoveExtra) => Promise<void>;
  onCancel: () => void;
}

function Actions({ ready, busy, onCancel, onSubmit }: { ready: boolean; busy: boolean; onCancel: () => void; onSubmit: () => void }) {
  const { t: tc } = useTranslation();
  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel}>{tc('actions.cancel')}</Button>
      <Button disabled={busy || !ready} onClick={onSubmit}>{tc('actions.save')}</Button>
    </div>
  );
}

/** The note that goes with work sent back from review (the fields live apart so "touched" starts fresh at every opening). */
function NoteForm({ busy, onAnswer, onCancel }: Pick<Props, 'busy' | 'onAnswer' | 'onCancel'>) {
  const { t } = useTranslation('tasks');
  const [note, setNote] = useState('');
  return (
    <div className="flex flex-col gap-4">
      <FormField label={`${t('transition.note')} *`}>{(p) => <Textarea {...p} rows={4} maxLength={5000} aria-required autoFocus value={note} onChange={(e) => setNote(e.target.value)} />}</FormField>
      <Actions ready={note.trim().length > 0} busy={busy} onCancel={onCancel} onSubmit={() => void onAnswer({ note: note.trim() })} />
    </div>
  );
}

/** The real day the work ended, for a task finished later than the policy allows without saying so. */
function DateForm({ busy, today, onAnswer, onCancel }: Pick<Props, 'busy' | 'today' | 'onAnswer' | 'onCancel'>) {
  const { t } = useTranslation('tasks');
  const [date, setDate] = useState(today);
  return (
    <div className="flex flex-col gap-4">
      <FormField label={`${t('transition.completedOn')} *`} hint={t('transition.completedOnHint')}>{(p) => <DateInput {...p} max={today} aria-required value={date} onChange={(e) => setDate(e.target.value)} />}</FormField>
      <Actions ready={!!date && date <= today} busy={busy} onCancel={onCancel} onSubmit={() => void onAnswer({ completedOn: date })} />
    </div>
  );
}

/** Finishing the work: the delivery files, optional (the same box as a ticket's, with a thumbnail to look at each file). «Skip» moves the task with none. */
function FilesForm({ busy, onAnswer, onCancel }: Pick<Props, 'busy' | 'onAnswer' | 'onCancel'>) {
  const { t } = useTranslation('tasks');
  const { t: tc } = useTranslation();
  const [files, setFiles] = useState<FileDto[]>([]);
  return (
    <div className="flex flex-col gap-4">
      <FileAttachments files={files} onChange={setFiles} max={MAX_TASK_FILES} label={t('files.deliveryTitle')} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>{tc('actions.cancel')}</Button>
        <Button variant="secondary" disabled={busy} onClick={() => void onAnswer({})}>{t('transition.skipFiles')}</Button>
        <Button disabled={busy || files.length === 0} onClick={() => void onAnswer({ fileIds: files.map((f) => f.id) })}>{t('transition.sendWithFiles')}</Button>
      </div>
    </div>
  );
}

const COPY = { note: 'note', date: 'date', files: 'files' } as const;

/** What is asked before a card moves: the delivery files (when the work is finished), a note, or the real completion date (the last two when the API asked). */
export function TransitionDialogs({ pending, busy, today, onAnswer, onCancel }: Props) {
  const { t } = useTranslation('tasks');
  if (!pending) return null;
  const copy = COPY[pending.needs];
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()} title={t(`transition.${copy}Title`)} description={t(`transition.${copy}Description`)}>
      {pending.needs === 'note' && <NoteForm busy={busy} onAnswer={onAnswer} onCancel={onCancel} />}
      {pending.needs === 'date' && <DateForm busy={busy} today={today} onAnswer={onAnswer} onCancel={onCancel} />}
      {pending.needs === 'files' && <FilesForm busy={busy} onAnswer={onAnswer} onCancel={onCancel} />}
    </Dialog>
  );
}
