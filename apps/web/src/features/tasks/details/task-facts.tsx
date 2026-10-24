import type { TaskDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';

const hours = (minutes: number): string => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

/** Who, when and how long, as a list of facts. */
export function TaskFacts({ task }: { task: TaskDto }) {
  const { t, i18n } = useTranslation('tasks');
  const ar = i18n.language === 'ar';
  const rows: [string, string][] = [
    [t('columns.assignee'), task.assignee.name],
    [t('details.creator'), task.creator.name],
    [t('columns.dueDate'), task.dueDate],
    [t('details.logged'), task.estimateMinutes === null ? hours(task.loggedMinutes) : `${hours(task.loggedMinutes)} / ${hours(task.estimateMinutes)}`],
    [t('columns.tag'), task.tag ? (ar ? task.tag.nameAr : task.tag.nameEn) : '—'],
    [t('details.reviewer'), task.reviewer?.name ?? '—'],
    [t('details.approver'), task.status === 'pending_approval' ? (task.approver?.name ?? '—') : '—'],
    [t('details.recurrence'), t(`recurrence.${task.recurrence}`)],
    [t('details.followers'), String(task.followers)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-sm sm:grid-cols-3">
      {rows.map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="font-medium" dir={/^[\d:/ -]+$/.test(value) ? 'ltr' : undefined}>{value}</dd></div>)}
    </dl>
  );
}
