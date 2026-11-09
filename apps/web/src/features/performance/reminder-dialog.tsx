import { REMINDER_KINDS, REMINDER_TIMING, type ReminderDto, type ReminderKind } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, Dialog, DialogFooter, FormField, Input, Select, Textarea } from '@/shared/ui';
import { useAddReminder, useUpdateReminder } from './api';
import { checkDraft, emptyDraft, toDraft, type ReminderDraft, type ReminderField } from './reminder-draft';

/** The label of the days field: a list before the employee's deadline, one number before a date, or the number of days between two reminders. */
const daysLabel = (kind: ReminderKind): string => (kind === 'self' ? 'selfDays' : REMINDER_TIMING[kind] === 'before' ? 'before' : 'every');

/** A reminder to add or change: its kind and when, its words in Arabic (and in English, which is optional), and whether it is on; each field says what is wrong as it is typed. */
export function ReminderDialog({ reminder, onClose }: { reminder: ReminderDto | null; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const add = useAddReminder();
  const update = useUpdateReminder();
  const [draft, setDraft] = useState<ReminderDraft>(reminder ? toDraft(reminder) : emptyDraft());
  const [touched, setTouched] = useState<ReminderField[]>([]);
  const [tried, setTried] = useState(false);
  const { input, bad } = checkDraft(draft);
  const failed = add.isError || update.isError;
  const set = <K extends keyof ReminderDraft>(key: K, value: ReminderDraft[K], field?: ReminderField) => { setDraft({ ...draft, [key]: value }); if (field && !touched.includes(field)) setTouched([...touched, field]); };
  const error = (field: ReminderField, text: string) => ((tried || touched.includes(field)) && bad.has(field) ? text : undefined);
  const done = () => { toast.success(t(reminder ? 'reminders.updated' : 'reminders.added')); onClose(); };
  const submit = () => {
    setTried(true);
    if (!input) return;
    if (reminder) update.mutate({ id: reminder.id, ...input }, { onSuccess: done });
    else add.mutate(input, { onSuccess: done });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t(reminder ? 'reminders.editTitle' : 'reminders.addTitle')} description={t('reminders.dialogDescription')} wide>
      <div className="flex flex-col gap-4">
        <FormField label={t('reminders.fields.kind')}>{(p) => <Select {...p} value={draft.kind} onChange={(e) => set('kind', e.target.value as ReminderKind, 'days')}>{REMINDER_KINDS.map((k) => <option key={k} value={k}>{t(`reminders.kinds.${k}`)}</option>)}</Select>}</FormField>
        <FormField label={t(`reminders.fields.${daysLabel(draft.kind)}`)} error={error('days', t(`reminders.invalid.${draft.kind === 'self' ? 'self' : 'one'}`))}>{(p) => <Input {...p} dir="ltr" aria-required value={draft.days} onChange={(e) => set('days', e.target.value, 'days')} />}</FormField>
        <FormField label={t('reminders.fields.titleAr')} error={error('titleAr', t('reminders.invalid.text'))}>{(p) => <Input {...p} aria-required maxLength={120} value={draft.titleAr} onChange={(e) => set('titleAr', e.target.value, 'titleAr')} />}</FormField>
        <FormField label={t('reminders.fields.bodyAr')} error={error('bodyAr', t('reminders.invalid.text'))}>{(p) => <Textarea {...p} aria-required rows={3} maxLength={600} value={draft.bodyAr} onChange={(e) => set('bodyAr', e.target.value, 'bodyAr')} />}</FormField>
        <FormField label={t('reminders.fields.titleEn')} hint={t('reminders.fields.englishHint')}>{(p) => <Input {...p} dir="ltr" maxLength={120} value={draft.titleEn} onChange={(e) => set('titleEn', e.target.value)} />}</FormField>
        <FormField label={t('reminders.fields.bodyEn')}>{(p) => <Textarea {...p} dir="ltr" rows={3} maxLength={600} value={draft.bodyEn} onChange={(e) => set('bodyEn', e.target.value)} />}</FormField>
        <label className="flex items-center gap-2 font-medium text-fg"><input type="checkbox" className="size-5 accent-petrol-800" checked={draft.on} onChange={(e) => set('on', e.target.checked)} />{t('reminders.fields.on')}</label>
        {failed && <Alert tone="danger">{t('reminders.failed')}</Alert>}
      </div>
      <DialogFooter>
        <Button disabled={add.isPending || update.isPending} onClick={submit}>{t('reminders.save')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
