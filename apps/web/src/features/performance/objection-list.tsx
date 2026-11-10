import { CorePermission, type ObjectionRowDto } from '@arweqah-platform/shared';
import { Check, MessageSquareWarning, Undo2, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { Badge, DataTable, EmptyState, RowAction, type Column } from '@/shared/ui';
import { useFinalizeObjection, useObjections, useReturnObjection } from './api';
import { RejectDialog } from './reject-dialog';

const TONE = { open: 'warning', returned: 'info', reevaluated: 'info', finalized: 'success', rejected: 'neutral' } as const;

/** What the holder of the approval key can do with an objection: accept it (back to the manager), refuse it, or approve the revised evaluation. */
function Actions({ row, onReject }: { row: ObjectionRowDto; onReject: (r: ObjectionRowDto) => void }) {
  const { t } = useTranslation('performance');
  const back = useReturnObjection();
  const finalize = useFinalizeObjection();
  const done = (key: string) => ({ onSuccess: () => toast.success(t(key)) });
  return (
    <Can permission={CorePermission.PerformanceApprove}>
      {row.status === 'open' && <><RowAction label={`${t('objections.return')}: ${row.employeeName}`} icon={Undo2} disabled={back.isPending} onClick={() => back.mutate(row.id, done('objections.returned'))} /><RowAction label={`${t('objections.reject')}: ${row.employeeName}`} icon={X} danger onClick={() => onReject(row)} /></>}
      {row.status === 'reevaluated' && <RowAction label={`${t('objections.finalize')}: ${row.employeeName}`} icon={Check} disabled={finalize.isPending} onClick={() => finalize.mutate(row.id, done('objections.finalized'))} />}
    </Can>
  );
}

/** The objections of the cycle: who objected to what and why, where each stands, and the holder's decisions. */
export function ObjectionList() {
  const { t } = useTranslation('performance');
  const query = useObjections();
  const [rejecting, setRejecting] = useState<ObjectionRowDto | null>(null);
  const item = (x: ObjectionRowDto) => `${t(`objections.kinds.${x.itemKind}`)} ${x.itemKind === 'criterion' ? Number(x.itemRef) + 1 : x.itemRef}`;
  const columns: Column<ObjectionRowDto>[] = [
    { id: 'employee', header: t('objections.columns.employee'), cell: (x) => <span className="font-medium">{x.employeeName}</span> },
    { id: 'item', header: t('objections.columns.item'), cell: item },
    { id: 'reason', header: t('objections.columns.reason'), cell: (x) => x.reason },
    { id: 'status', header: t('objections.columns.status'), cell: (x) => <Badge tone={TONE[x.status]}>{t(`objections.status.${x.status}`)}</Badge> },
  ];
  return (
    <>
      <DataTable<ObjectionRowDto> listKey="performance-objections" caption={t('objections.title')} title={t('objections.title')} rows={query.data?.items} isLoading={query.isPending} error={query.error} rowKey={(x) => x.id} columns={columns} actions={(x) => <Actions row={x} onReject={setRejecting} />} empty={<EmptyState icon={MessageSquareWarning} title={t('objections.empty')} />} />
      {rejecting && <RejectDialog row={rejecting} onClose={() => setRejecting(null)} />}
    </>
  );
}
