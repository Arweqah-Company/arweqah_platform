import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, FormField, Input, Textarea } from '@/shared/ui';
import type { PendingMove } from './use-board-move';

interface Props {
  pending: PendingMove | null;
  busy: boolean;
  today: string;
  onAnswer: (extra: { note?: string; completedOn?: string }) => Promise<void>;
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
      <FormField label={`${t('transition.completedOn')} *`} hint={t('transition.completedOnHint')}>{(p) => <Input {...p} type="date" dir="ltr" max={today} aria-required value={date} onChange={(e) => setDate(e.target.value)} />}</FormField>
      <Actions ready={!!date && date <= today} busy={busy} onCancel={onCancel} onSubmit={() => void onAnswer({ completedOn: date })} />
    </div>
  );
}

/** What the API asked for before it could move a card: a note, or the real completion date. */
export function TransitionDialogs({ pending, busy, today, onAnswer, onCancel }: Props) {
  const { t } = useTranslation('tasks');
  if (!pending) return null;
  const note = pending.needs === 'note';
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()} title={note ? t('transition.noteTitle') : t('transition.dateTitle')} description={note ? t('transition.noteDescription') : t('transition.dateDescription')}>
      {note ? <NoteForm busy={busy} onAnswer={onAnswer} onCancel={onCancel} /> : <DateForm busy={busy} today={today} onAnswer={onAnswer} onCancel={onCancel} />}
    </Dialog>
  );
}
