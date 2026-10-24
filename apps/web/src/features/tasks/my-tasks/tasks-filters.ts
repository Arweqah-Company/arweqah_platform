import { TASK_GROUPINGS, TASK_PRIORITIES, TASK_STATUSES, type TaskFormOptionsDto, type TaskGrouping, type TaskListItemDto, type TasksQuery } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import type { FilterValues } from '@/shared/lib/use-filters';
import type { FilterField } from '@/shared/ui';

export const GROUPINGS = TASK_GROUPINGS;

/**
 * Status, priority, person, tag, stale, overdue and (for those who may) the archive; plus "include finished tasks", off by default,
 * because the page opens on the open tasks.
 */
export function useTaskFilterFields(options: TaskFormOptionsDto | undefined, withArchive: boolean): FilterField[] {
  const { t, i18n } = useTranslation('tasks');
  const ar = i18n.language === 'ar';
  const fields: FilterField[] = [
    { id: 'status', label: t('filters.status'), type: 'select', options: TASK_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })) },
    { id: 'priority', label: t('filters.priority'), type: 'select', options: TASK_PRIORITIES.map((p) => ({ value: p, label: t(`priority.${p}`) })) },
    { id: 'assigneeId', label: t('filters.assignee'), type: 'select', options: (options?.assignees ?? []).map((a) => ({ value: a.id, label: a.name })) },
    { id: 'tagId', label: t('filters.tag'), type: 'select', options: (options?.tags ?? []).map((x) => ({ value: x.id, label: ar ? x.nameAr : x.nameEn })) },
    { id: 'stale', label: t('filters.stale'), type: 'toggle' },
    { id: 'overdue', label: t('filters.overdue'), type: 'toggle' },
    { id: 'showClosed', label: t('filters.showClosed'), type: 'toggle' },
  ];
  return withArchive ? [...fields, { id: 'archived', label: t('filters.archived'), type: 'toggle' }] : fields;
}

const flag = (values: FilterValues, id: string): true | undefined => (values[id] ? true : undefined);

/** The query for the filters. Without a chosen status or "include finished", only open tasks (the board shows every column, so it asks for all). */
export function toTasksQuery(values: FilterValues, board: boolean): Partial<TasksQuery> {
  const text = (id: string) => values[id] || undefined;
  return {
    status: text('status') as TasksQuery['status'],
    priority: text('priority') as TasksQuery['priority'],
    assigneeId: text('assigneeId'),
    tagId: text('tagId'),
    stale: flag(values, 'stale'),
    overdue: flag(values, 'overdue'),
    archived: flag(values, 'archived'),
    openOnly: !board && !values.status && !values.showClosed ? true : undefined,
  };
}

/** The heading a task belongs to when the list is grouped. */
export function groupLabel(task: TaskListItemDto, groupBy: TaskGrouping, t: (key: string) => string, today: string): string {
  switch (groupBy) {
    case 'person':
      return task.assignee.name;
    case 'status':
      return t(`status.${task.status}`);
    case 'due':
      return task.dueDate < today ? t('groups.overdue') : task.dueDate;
  }
}
