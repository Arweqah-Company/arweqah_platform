import { useTranslation } from 'react-i18next';
import { FormField, Select } from '@/shared/ui';

export type Reach = 'direct' | 'all';

/** What the team tab adds: the people it shows (direct reports, or everyone below) and, on the board, one row for each person. */
export function TeamControls({ reach, onReach, board, lanes, onLanes }: { reach: Reach; onReach: (value: Reach) => void; board: boolean; lanes: boolean; onLanes: (value: boolean) => void }) {
  const { t } = useTranslation('tasks');
  return (
    <div className="mb-4 flex flex-wrap items-end gap-4">
      <FormField label={t('team.reach')}>
        {(p) => (
          <Select {...p} className="max-w-64" value={reach} onChange={(e) => onReach(e.target.value as Reach)}>
            <option value="direct">{t('team.direct')}</option>
            <option value="all">{t('team.all')}</option>
          </Select>
        )}
      </FormField>
      {board && (
        <label className="flex h-12 items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-petrol-800" checked={lanes} onChange={(e) => onLanes(e.target.checked)} />
          {t('team.lanes')}
        </label>
      )}
    </div>
  );
}
