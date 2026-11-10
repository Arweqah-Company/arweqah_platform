import { CorePermission, type MilestoneRowDto } from '@arweqah-platform/shared';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { Alert, Button, Dialog, DialogFooter, RowAction } from '@/shared/ui';
import { useMemberMilestones } from './api';
import { MilestoneFormDialog } from './milestone-form-dialog';
import { MilestoneTable } from './milestone-table';

/** One team member's milestones for the manager: the table of the year and, for a milestone that runs, the button to record (or change) its minutes. */
export function MemberMilestonesDialog({ employeeId, name, onClose }: { employeeId: string; name: string; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const query = useMemberMilestones(employeeId);
  const [editing, setEditing] = useState<MilestoneRowDto | null>(null);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('milestones.memberTitle', { name })} description={t('milestones.memberHint')} wide>
      {query.isError && <Alert tone="danger">{t('milestones.loadFailed')}</Alert>}
      {query.data && (
        <MilestoneTable items={query.data.items} action={(m) => m.state !== 'skipped' && <Can permission={CorePermission.PerformanceMilestoneRecord}><RowAction label={`${t(m.record ? 'milestones.edit' : 'milestones.record')}: ${t(`milestones.names.${m.key}`)}`} icon={Pencil} onClick={() => setEditing(m)} /></Can>} />
      )}
      <DialogFooter><Button variant="secondary" onClick={onClose}>{t('close')}</Button></DialogFooter>
      {editing && <MilestoneFormDialog employeeId={employeeId} row={editing} onClose={() => setEditing(null)} />}
    </Dialog>
  );
}
