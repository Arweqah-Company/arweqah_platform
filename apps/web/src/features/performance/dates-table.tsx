import { CorePermission, CYCLE_DATE_KEYS, type CycleDate, type CycleDateKey } from '@arweqah-platform/shared';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiError } from '@/core/api/api-client';
import { Can } from '@/core/permissions/can';
import { Alert, Button, DataTable, Dialog, DialogFooter, FormField, Input, RowAction, type Column } from '@/shared/ui';
import { useSetDate } from './api';

interface DateRow {
  key: CycleDateKey;
  from: string | null;
  to: string | null;
}

/** One date of the cycle: «from» is required, «to» is optional; a date that does not fit the others is refused with the reasons in words. */
function DateDialog({ row, onClose }: { row: DateRow; onClose: () => void }) {
  const { t } = useTranslation('performance');
  const save = useSetDate();
  const [from, setFrom] = useState(row.from ?? '');
  const [to, setTo] = useState(row.to ?? '');
  const problems = save.error instanceof ApiError ? ((save.error.details as { problems?: string[] } | undefined)?.problems ?? []) : [];
  const submit = () => save.mutate({ key: row.key, from, to: to || null }, { onSuccess: () => { toast.success(t('dates.saved')); onClose(); } });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={t('dates.edit')} description={t(`dates.keys.${row.key}`)}>
      <FormField label={t('dates.from')}>{(p) => <Input {...p} type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />}</FormField>
      <FormField label={t('dates.to')} hint={t('dates.toHint')}>{(p) => <Input {...p} type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />}</FormField>
      {problems.length > 0 && <Alert tone="danger"><ul className="list-disc ps-5">{problems.map((p) => <li key={p}>{t(`dates.problems.${p}`)}</li>)}</ul></Alert>}
      {save.isError && problems.length === 0 && <Alert tone="danger">{t('dates.failed')}</Alert>}
      <DialogFooter>
        <Button disabled={!from || save.isPending} onClick={submit}>{t('save')}</Button>
        <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
      </DialogFooter>
    </Dialog>
  );
}

/** The dates of the stages of the cycle in progress, each with its edit. */
export function DatesTable({ dates, editable }: { dates: CycleDate[]; editable: boolean }) {
  const { t } = useTranslation('performance');
  const [open, setOpen] = useState<DateRow | null>(null);
  const rows: DateRow[] = CYCLE_DATE_KEYS.map((key) => ({ key, from: dates.find((d) => d.key === key)?.from ?? null, to: dates.find((d) => d.key === key)?.to ?? null }));
  const columns: Column<DateRow>[] = [
    { id: 'stage', header: t('dates.stage'), cell: (r) => <span className="font-medium">{t(`dates.keys.${r.key}`)}</span> },
    { id: 'from', header: t('dates.from'), cell: (r) => <span dir="ltr">{r.from ?? '—'}</span> },
    { id: 'to', header: t('dates.to'), cell: (r) => <span dir="ltr">{r.to ?? '—'}</span> },
  ];
  return (
    <>
      <DataTable<DateRow>
        caption={t('dates.title')}
        title={t('dates.title')}
        rows={rows}
        rowKey={(r) => r.key}
        columns={columns}
        onRowClick={editable ? setOpen : undefined}
        actions={editable ? (r) => <Can permission={CorePermission.PerformanceCycleManage}><RowAction label={`${t('dates.edit')}: ${t(`dates.keys.${r.key}`)}`} icon={Pencil} onClick={() => setOpen(r)} /></Can> : undefined}
      />
      {open && <DateDialog row={open} onClose={() => setOpen(null)} />}
    </>
  );
}
