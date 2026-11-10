import type { MilestoneRowDto, MilestoneState } from '@arweqah-platform/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLongDate } from '@/shared/lib/format-date';
import { Badge } from '@/shared/ui';

const TONE: Record<MilestoneState, 'neutral' | 'warning' | 'info' | 'success'> = { none: 'warning', recorded: 'info', acknowledged: 'success', skipped: 'neutral' };

/** The date HR set for a milestone, written out in the language of the screen; a dash when it has none. */
export function useMilestoneDate(): (m: Pick<MilestoneRowDto, 'date'>) => string {
  const { i18n } = useTranslation('performance');
  return (m) => (m.date ? formatLongDate(m.date, i18n.language) : '—');
}

/** The milestones of the year: the name, the date, where it stands, and (a slot) what the viewer can do with it. */
export function MilestoneTable({ items, action }: { items: MilestoneRowDto[]; action: (row: MilestoneRowDto) => ReactNode }) {
  const { t } = useTranslation('performance');
  const date = useMilestoneDate();
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full min-w-[28rem] text-sm">
        <caption className="sr-only">{t('milestones.title')}</caption>
        <thead className="bg-neutral-50 text-muted"><tr>{(['milestone', 'date', 'state', 'actions'] as const).map((h) => <th key={h} scope="col" className="px-3 py-2 text-start font-medium">{t(`milestones.columns.${h}`)}</th>)}</tr></thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.key} className="border-t border-neutral-200">
              <td className="px-3 py-2 font-medium text-fg">{t(`milestones.names.${m.key}`)}</td>
              <td className="px-3 py-2 text-fg">{date(m)}</td>
              <td className="px-3 py-2"><Badge tone={TONE[m.state]}>{t(`milestones.state.${m.state}`)}</Badge></td>
              <td className="px-3 py-2">{action(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
