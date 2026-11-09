import { CorePermission, type CycleDate } from '@arweqah-platform/shared';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { formatLongDate } from '@/shared/lib/format-date';
import { RowAction } from '@/shared/ui';
import { CycleCard, MiniTable } from './cycle-card';
import { DateDialog } from './date-dialog';

/** The seven dates of the cycle (the open one's, or the next one's before it opens): the range written out, the stage it belongs to and a pencil to change it. */
export function DatesCard({ dates }: { dates: CycleDate[] }) {
  const { t, i18n } = useTranslation('performance');
  const [editing, setEditing] = useState<CycleDate | null>(null);
  const day = (iso: string) => formatLongDate(iso, i18n.language);
  const rows = dates.map((d) => {
    const name = t(`dates.keys.${d.key}`);
    return {
      key: d.key,
      cells: [d.to ? t('dates.range', { from: day(d.from), to: day(d.to) }) : day(d.from), name],
      action: <Can permission={CorePermission.PerformanceCycleManage}><RowAction label={t('dates.editLabel', { name })} icon={Pencil} onClick={() => setEditing(d)} /></Can>,
    };
  });
  return (
    <CycleCard title={t('dates.title')}>
      <MiniTable caption={t('dates.title')} rows={rows} strong />
      {editing && <DateDialog date={editing} dates={dates} onClose={() => setEditing(null)} />}
    </CycleCard>
  );
}
