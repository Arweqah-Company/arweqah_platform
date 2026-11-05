import { CorePermission, type OrgNodeLeaderDto } from '@arweqah-platform/shared';
import { CalendarX2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { todayInRiyadh } from '@/shared/lib/lines';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, ConfirmDialog, Dialog, DialogFooter, FormField, Input, RowAction, Textarea } from '@/shared/ui';
import { useEndLeader, useRemoveLeader } from './api';
import { REASON_MIN } from './leader-rules';

/** Ending a leader that is in force: the last day (today or later) and the reason. */
function EndLeaderDialog({ nodeId, leader, onClose }: { nodeId: string; leader: OrgNodeLeaderDto; onClose: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const rules = useRules();
  const today = todayInRiyadh();
  const [endDate, setEndDate] = useState(today);
  const [reason, setReason] = useState('');
  const end = useEndLeader(nodeId);
  const reasonError = useLiveError(reason, rules.text(REASON_MIN));
  const dateError = useLiveError(endDate, (v: string) => (v < today ? t('leaders.errors.endPast') : undefined));
  const valid = endDate >= today && reason.trim().length >= REASON_MIN;
  const submit = async () => {
    try {
      await end.mutateAsync({ leaderId: leader.id, endDate, reason: reason.trim() });
      toast.success(t('leaders.ended'));
      onClose();
    } catch {
      /* shown inside the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('leaders.endTitle')} description={leader.employeeName}>
      <div className="flex flex-col gap-4">
        {end.isError && <Alert>{errorMessage(tc, end.error)}</Alert>}
        <FormField label={`${t('leaders.endDate')} *`} hint={t('leaders.endHint')} error={dateError.error}>{(p) => <Input {...p} type="date" dir="ltr" min={today} onBlur={dateError.onBlur} value={endDate} onChange={(e) => setEndDate(e.target.value)} />}</FormField>
        <FormField label={`${t('leaders.reason')} *`} error={reasonError.error}>{(p) => <Textarea {...p} rows={2} onBlur={reasonError.onBlur} value={reason} onChange={(e) => setReason(e.target.value)} />}</FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button variant="danger" disabled={!valid || end.isPending} onClick={() => void submit()}>{t('leaders.end')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

/** Removing a leader that has not started yet, behind its own confirmation. */
function RemoveLeaderDialog({ nodeId, leader, onClose }: { nodeId: string; leader: OrgNodeLeaderDto; onClose: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const remove = useRemoveLeader(nodeId);
  const confirm = async () => {
    try {
      await remove.mutateAsync(leader.id);
      toast.success(t('leaders.removed'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      onClose();
    }
  };
  return <ConfirmDialog open onOpenChange={(open) => !open && onClose()} tone="danger" busy={remove.isPending} title={t('leaders.removeTitle')} description={t('leaders.removeBody', { name: leader.employeeName })} confirmLabel={tc('actions.delete')} onConfirm={confirm} />;
}

/** What may be done to a leader row: end one in force, remove one that has not started; nothing for an ended one. Each button needs the leaders key and admin mode. */
export function LeaderActions({ nodeId, leader }: { nodeId: string; leader: OrgNodeLeaderDto }) {
  const { t } = useTranslation('org');
  const [open, setOpen] = useState<'end' | 'remove' | null>(null);
  const close = () => setOpen(null);
  if (leader.status === 'past') return null;
  return (
    <>
      <Can adminMode permission={CorePermission.OrgLeadersManage}>
        {leader.status === 'current'
          ? <RowAction label={`${t('leaders.end')}: ${leader.employeeName}`} icon={CalendarX2} onClick={() => setOpen('end')} />
          : <RowAction label={`${t('leaders.remove')}: ${leader.employeeName}`} icon={Trash2} danger onClick={() => setOpen('remove')} />}
      </Can>
      {open === 'end' && <EndLeaderDialog nodeId={nodeId} leader={leader} onClose={close} />}
      {open === 'remove' && <RemoveLeaderDialog nodeId={nodeId} leader={leader} onClose={close} />}
    </>
  );
}
