import { MILESTONE_ACTION_MIN, milestoneProblems, type MilestoneRowDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Alert, Button, Dialog, DialogFooter, FormField, Textarea } from '@/shared/ui';
import { useRecordMilestone } from './api';

/** The form starts from the minutes already kept, or empty. */
const startOf = (record: MilestoneRowDto['record']) => ({ whereWeAre: record?.whereWeAre ?? '', obstacle: record?.obstacle ?? '', agreedAction: record?.agreedAction ?? '', note: record?.note ?? '' });

const FIELDS = { review: ['whereWeAre', 'obstacle', 'agreedAction'], pulse: ['note'], warning: [] } as const;

/** The minutes of one milestone: «where are we», «what is in the way» and the agreed action (required) for a review; one short note for a pulse. */
export function MilestoneFormDialog({ employeeId, row, onClose }: { employeeId: string; row: MilestoneRowDto; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const record = useRecordMilestone(employeeId);
  const [form, setForm] = useState(startOf(row.record));
  const incomplete = milestoneProblems(row.kind, { whereWeAre: form.whereWeAre.trim(), obstacle: form.obstacle.trim(), agreedAction: form.agreedAction.trim(), note: form.note.trim() }).length > 0;
  const submit = () => record.mutate({ key: row.key, ...form }, { onSuccess: () => { toast.success(t('milestones.saved')); onClose(); } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('milestones.recordTitle', { name: t(`milestones.names.${row.key}`) })} description={t('milestones.recordHint')}>
      <div className="flex flex-col gap-4">
        {FIELDS[row.kind].map((f) => (
          <FormField key={f} label={t(`milestones.fields.${f}`)} hint={f === 'agreedAction' ? t('milestones.actionHint', { count: MILESTONE_ACTION_MIN }) : undefined}>{(p) => <Textarea {...p} rows={3} value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} />}</FormField>
        ))}
        {record.isError && <Alert tone="danger">{t('milestones.failed')}</Alert>}
      </div>
      <DialogFooter>
        <Button disabled={incomplete || record.isPending} onClick={submit}>{t('milestones.save')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('cancel')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
