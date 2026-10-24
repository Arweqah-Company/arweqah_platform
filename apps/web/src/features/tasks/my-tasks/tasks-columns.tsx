import type { TaskListItemDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { ExportColumn } from '@/shared/data-exchange/types';
import type { Column } from '@/shared/ui';
import { TaskFlags, TaskPriorityBadge, TaskStatusBadge } from '../task-badges';

const minutes = (value: number | null, t: (key: string, options?: Record<string, unknown>) => string): string => {
  if (value === null) return '—';
  return value >= 60 ? t('estimate.hours', { hours: Math.round((value / 60) * 10) / 10 }) : t('estimate.minutes', { count: value });
};

/** The columns of a task list; every one sorts by its header except the title block's marks. */
export function useTaskColumns(): Column<TaskListItemDto>[] {
  const { t, i18n } = useTranslation('tasks');
  const ar = i18n.language === 'ar';
  return [
    {
      id: 'title',
      header: t('columns.title'),
      sortKey: 'title',
      className: 'min-w-56',
      cell: (x) => (
        <span className="flex flex-col gap-1">
          <Link to={`/tasks/${x.id}`} className="font-medium hover:underline">{x.title}</Link>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted"><span dir="ltr">{x.number}</span><TaskFlags flags={x.flags} /></span>
        </span>
      ),
    },
    { id: 'assignee', header: t('columns.assignee'), sortKey: 'assignee', cell: (x) => x.assignee.name },
    { id: 'dueDate', header: t('columns.dueDate'), sortKey: 'dueDate', className: 'whitespace-nowrap', cell: (x) => <span dir="ltr">{x.dueDate}</span> },
    { id: 'priority', header: t('columns.priority'), sortKey: 'priority', cell: (x) => <TaskPriorityBadge priority={x.priority} /> },
    { id: 'status', header: t('columns.status'), sortKey: 'status', cell: (x) => <TaskStatusBadge status={x.status} /> },
    { id: 'tag', header: t('columns.tag'), sortKey: 'tag', cell: (x) => (x.tag ? (ar ? x.tag.nameAr : x.tag.nameEn) : '—') },
    { id: 'estimate', header: t('columns.estimate'), sortKey: 'estimate', className: 'whitespace-nowrap', cell: (x) => minutes(x.estimateMinutes, t) },
  ];
}

/** What an export file holds for each task (the same facts as the table, as plain text). */
export function useTaskExportColumns(): ExportColumn<TaskListItemDto>[] {
  const { t, i18n } = useTranslation('tasks');
  const ar = i18n.language === 'ar';
  return [
    { id: 'number', header: t('columns.number'), value: (x) => x.number },
    { id: 'title', header: t('columns.title'), value: (x) => x.title },
    { id: 'assignee', header: t('columns.assignee'), value: (x) => x.assignee.name },
    { id: 'creator', header: t('details.creator'), value: (x) => x.creator.name },
    { id: 'dueDate', header: t('columns.dueDate'), value: (x) => x.dueDate },
    { id: 'priority', header: t('columns.priority'), value: (x) => t(`priority.${x.priority}`) },
    { id: 'status', header: t('columns.status'), value: (x) => t(`status.${x.status}`) },
    { id: 'tag', header: t('columns.tag'), value: (x) => (x.tag ? (ar ? x.tag.nameAr : x.tag.nameEn) : '') },
    { id: 'estimate', header: t('columns.estimate'), value: (x) => x.estimateMinutes ?? '' },
  ];
}
