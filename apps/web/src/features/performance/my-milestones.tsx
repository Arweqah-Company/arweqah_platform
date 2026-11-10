import { CorePermission, type MilestoneRowDto } from '@arweqah-platform/shared';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { Alert, Button } from '@/shared/ui';
import { useAckMilestone, useMyMilestones } from './api';
import { MilestoneTable } from './milestone-table';

/** What the manager wrote at a milestone, and the employee's acknowledgement. */
function Minutes({ row }: { row: MilestoneRowDto }) {
  const { t } = useTranslation('performance');
  const ack = useAckMilestone();
  const r = row.record;
  if (!r) return null;
  const parts = [r.whereWeAre && [t('milestones.fields.whereWeAre'), r.whereWeAre], r.obstacle && [t('milestones.fields.obstacle'), r.obstacle], r.agreedAction && [t('milestones.fields.agreedAction'), r.agreedAction], r.note && [t('milestones.fields.note'), r.note]].filter(Boolean) as [string, string][];
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-neutral-200 bg-white p-3 text-sm">
      <b className="text-fg">{t(`milestones.names.${row.key}`)}</b>
      {parts.map(([label, text]) => <p key={label} className="text-fg"><span className="text-muted">{label}: </span>{text}</p>)}
      <Can permission={CorePermission.PerformanceMilestoneAck}>
        {!r.acknowledgedAt && <Button className="self-start" disabled={ack.isPending} onClick={() => ack.mutate(row.key, { onSuccess: () => toast.success(t('milestones.acknowledged')) })}><Check className="size-4" aria-hidden />{t('milestones.acknowledge')}</Button>}
      </Can>
    </div>
  );
}

/** «The milestones of the year» for the employee: the calendar with where each stands, and the minutes the manager recorded. */
export function MyMilestones() {
  const { t } = useTranslation('performance');
  const query = useMyMilestones();
  if (query.isError) return <Alert tone="danger">{t('milestones.loadFailed')}</Alert>;
  if (!query.data) return null;
  const recorded = query.data.items.filter((m) => m.record);
  return (
    <div className="flex flex-col gap-3">
      <MilestoneTable items={query.data.items} action={() => null} />
      {recorded.map((m) => <Minutes key={m.key} row={m} />)}
    </div>
  );
}
